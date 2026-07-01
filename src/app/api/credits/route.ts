import { NextRequest, NextResponse } from 'next/server'
import { getUserCredits, addCredits, CREDIT_PACKS } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get('wallet')
  if (!wallet) return NextResponse.json({ error: 'Missing wallet' }, { status: 400 })
  const credits = await getUserCredits(wallet)
  return NextResponse.json({ success: true, credits, packs: CREDIT_PACKS })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { wallet, packId, txSignature } = body
    if (!wallet || !packId) return NextResponse.json({ error: 'Missing wallet or packId' }, { status: 400 })

    const pack = CREDIT_PACKS.find((p) => p.id === packId)
    if (!pack) return NextResponse.json({ error: 'Invalid pack' }, { status: 400 })

    const updated = await addCredits(wallet, pack.credits, pack.price, txSignature || null)
    return NextResponse.json({ success: true, credits: updated, purchased: pack.credits })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
