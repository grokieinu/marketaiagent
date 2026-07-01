import { NextRequest, NextResponse } from 'next/server'
import { getAllPendingWithdrawals, approveWithdrawal, rejectWithdrawal } from '@/lib/db'

const ADMIN_WALLET = '8McdPygGbvCiZSfkMjNrbumUs2aR8SEHZUYc2SNo5bFP'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get('wallet')
  if (wallet !== ADMIN_WALLET) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  const pending = await getAllPendingWithdrawals()
  return NextResponse.json({ success: true, withdrawals: pending })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { wallet, withdrawalId, action, txSignature } = body
    if (wallet !== ADMIN_WALLET) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    if (!withdrawalId || !action) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    if (action === 'approve') {
      if (!txSignature) return NextResponse.json({ error: 'txSignature required' }, { status: 400 })
      const result = await approveWithdrawal(withdrawalId, txSignature)
      return result ? NextResponse.json({ success: true, withdrawal: result }) : NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (action === 'reject') {
      const result = await rejectWithdrawal(withdrawalId)
      return result ? NextResponse.json({ success: true, withdrawal: result }) : NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
