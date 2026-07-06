import { NextRequest, NextResponse } from 'next/server'
import { createReview, getReviewsByAgent } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const agentId = request.nextUrl.searchParams.get('agentId')
  if (!agentId) return NextResponse.json({ error: 'Missing agentId' }, { status: 400 })
  const reviews = await getReviewsByAgent(agentId)
  return NextResponse.json({ success: true, reviews })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { agentId, userWallet, userName, rating, comment } = body
    if (!agentId || !rating || !comment) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    if (rating < 1 || rating > 5) return NextResponse.json({ error: 'Rating 1-5' }, { status: 400 })

    const review = await createReview({
      agentId, userWallet: userWallet || 'anonymous',
      userName: userName || 'Anonymous', rating: Math.round(rating), comment,
    })
    return NextResponse.json({ success: true, review })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
