import { NextRequest, NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get('wallet')
  if (!wallet) return NextResponse.json({ error: 'Missing wallet' }, { status: 400 })

  try {
    const client = new MongoClient(process.env.MONGODB_URI!)
    await client.connect()
    const db = client.db('grokie')

    const rows = await db.collection('requests').find({ userWallet: wallet }).sort({ createdAt: -1 }).limit(100).toArray()

    // Get agent names
    const agentIds = Array.from(new Set(rows.map(r => r.agentId)))
    const agents = await db.collection('agents').find({ id: { $in: agentIds } }).toArray()
    const nameMap: Record<string, any> = {}
    agents.forEach((a: any) => { nameMap[a.id] = { name: a.name, specialization: a.specialization } })

    const tasks = rows.map((r: any) => ({
      id: r.id,
      agentId: r.agentId,
      agentName: nameMap[r.agentId]?.name || 'Unknown',
      specialization: nameMap[r.agentId]?.specialization || 'other',
      prompt: r.prompt,
      response: r.response || '',
      amount: parseFloat(r.creditsCost) || 0,
      createdAt: r.createdAt,
      status: r.response ? 'completed' : 'failed',
    }))

    await client.close()
    return NextResponse.json({ success: true, tasks }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed' }, { status: 500 })
  }
}
