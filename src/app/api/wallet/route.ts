import { NextRequest, NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'

export const dynamic = 'force-dynamic'

const MIN_CREATOR_WITHDRAW = 0.5

async function getDb() {
  const client = new MongoClient(process.env.MONGODB_URI!)
  await client.connect()
  return client.db('grokie')
}

export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get('wallet')
  if (!wallet) return NextResponse.json({ error: 'Missing wallet' }, { status: 400 })

  try {
    const db = await getDb()
    const user = await db.collection('user_balances').findOne({ wallet })
    const creator = await db.collection('creator_earnings').findOne({ wallet })

    return NextResponse.json({
      success: true,
      balance: user?.balance || 0,
      earnings: creator?.earnings || 0,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { wallet, action, amount } = body
    if (!wallet || !action) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

    const db = await getDb()

    if (action === 'deposit') {
      if (!amount || amount <= 0) return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
      await db.collection('user_balances').updateOne(
        { wallet },
        { $inc: { balance: amount, totalDeposited: amount }, $setOnInsert: { wallet } },
        { upsert: true }
      )
      const user = await db.collection('user_balances').findOne({ wallet })
      return NextResponse.json({ success: true, balance: user?.balance || 0 })
    }

    if (action === 'withdraw') {
      if (!amount || amount <= 0) return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
      const user = await db.collection('user_balances').findOne({ wallet })
      if (!user || user.balance < amount) return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 })
      await db.collection('user_balances').updateOne({ wallet }, { $inc: { balance: -amount, totalWithdrawn: amount } })
      const updated = await db.collection('user_balances').findOne({ wallet })
      return NextResponse.json({ success: true, balance: updated?.balance || 0 })
    }

    if (action === 'creator_withdraw') {
      const creator = await db.collection('creator_earnings').findOne({ wallet })
      if (!creator || creator.earnings < MIN_CREATOR_WITHDRAW) {
        return NextResponse.json({ error: `Minimum withdrawal is ${MIN_CREATOR_WITHDRAW} SOL` }, { status: 400 })
      }
      const amount = creator.earnings
      await db.collection('creator_earnings').updateOne({ wallet }, { $set: { earnings: 0 }, $inc: { totalWithdrawn: amount } })
      return NextResponse.json({ success: true, amount })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
