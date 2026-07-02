import { NextRequest, NextResponse } from 'next/server'
import { getAgentsByOwner, getAllAgents } from '@/lib/db'
import { neon } from '@neondatabase/serverless'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get('wallet')
  if (!wallet) return NextResponse.json({ error: 'Wallet required' }, { status: 400 })

  const sql = neon(process.env.DATABASE_URL!)

  const myAgents = await getAgentsByOwner(wallet)
  const myAgentIds = myAgents.map((a) => a.id)

  // Get received requests (to my agents)
  let receivedRequests: any[] = []
  if (myAgentIds.length > 0) {
    const rows = await sql`SELECT r.*, a.name as agent_name FROM requests r JOIN agents a ON r.agent_id = a.id WHERE r.agent_id = ANY(${myAgentIds}) ORDER BY r.created_at DESC LIMIT 20`
    receivedRequests = rows.map((r: any) => ({
      id: r.id, agentId: r.agent_id, agentName: r.agent_name,
      prompt: r.prompt, amount: r.credits_cost, createdAt: r.created_at,
    }))
  }

  // Get sent requests (by this wallet)
  const sentRows = await sql`SELECT r.*, a.name as agent_name FROM requests r JOIN agents a ON r.agent_id = a.id WHERE r.user_wallet = ${wallet} ORDER BY r.created_at DESC LIMIT 20`
  const sentRequests = sentRows.map((r: any) => ({
    id: r.id, agentId: r.agent_id, agentName: r.agent_name,
    prompt: r.prompt, amount: r.credits_cost, createdAt: r.created_at,
  }))

  const totalEarnings = myAgents.reduce((sum, a) => sum + a.totalEarnings, 0)
  const totalRequests = myAgents.reduce((sum, a) => sum + a.totalRequests, 0)

  return NextResponse.json({
    success: true,
    myAgents,
    receivedRequests,
    sentRequests,
    stats: { totalAgents: myAgents.length, totalEarnings, totalRequests, totalSent: sentRequests.length },
  })
}
