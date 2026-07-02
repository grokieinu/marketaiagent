import { NextRequest, NextResponse } from 'next/server'
import { getAgentById, getRequestsByAgent, getReviewsByAgent } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const agent = await getAgentById(params.id)
  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }
  const recentRequests = await getRequestsByAgent(params.id)
  const reviews = await getReviewsByAgent(params.id)
  return NextResponse.json({ success: true, agent, recentRequests, reviews })
}
