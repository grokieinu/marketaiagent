import { NextRequest, NextResponse } from 'next/server'
import { getCreatorAvailableCredits, getCreatorWithdrawals, createWithdrawal, getCreatorEarnings, getCreatorWithdrawnTotal, CREDIT_TO_SOL_RATE, MIN_WITHDRAWAL_CREDITS } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get('wallet')
  if (!wallet) return NextResponse.json({ error: 'Missing wallet' }, { status: 400 })

  const totalEarned = await getCreatorEarnings(wallet)
  const totalWithdrawn = await getCreatorWithdrawnTotal(wallet)
  const available = await getCreatorAvailableCredits(wallet)
  const withdrawals = await getCreatorWithdrawals(wallet)

  return NextResponse.json({
    success: true,
    earnings: { totalEarned, totalWithdrawn, available, availableSol: Math.round(available * CREDIT_TO_SOL_RATE * 10000) / 10000, rate: CREDIT_TO_SOL_RATE, minWithdrawal: MIN_WITHDRAWAL_CREDITS },
    withdrawals,
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { wallet, credits } = body
    if (!wallet || !credits) return NextResponse.json({ error: 'Missing wallet or credits' }, { status: 400 })

    const result = await createWithdrawal(wallet, credits)
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: 400 })
    return NextResponse.json({ success: true, withdrawal: result })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
