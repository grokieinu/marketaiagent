import { NextRequest, NextResponse } from 'next/server'
import { getAgentsByOwner } from '@/lib/db'
import { neon } from '@neondatabase/serverless'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get('wallet')
  if (!wallet) return NextResponse.json({ error: 'Wallet required' }, { status: 400 })

  try {
    const sql = neon(process.env.DATABASE_URL!)

    const myAgents = await getAgentsByOwner(wallet)
    const myAgentIds = myAgents.map((a) => a.id)

    // Get received requests (to my agents) — use IN instead of ANY for compatibility
    let receivedRequests: any[] = []
    if (myAgentIds.length > 0) {
      // Query each agent individually and merge (Neon doesn't handle array params well)
      for (const agentId of myAgentIds) {
        const rows = await sql`SELECT r.*, a.name as agent_name FROM requests r JOIN agents a ON r.agent_id = a.id WHERE r.agent_id = ${agentId} ORDER BY r.created_at DESC LIMIT 50`
        receivedRequests.push(...rows.map((r: any) => ({
          id: r.id, agentId: r.agent_id, agentName: r.agent_name,
          prompt: r.prompt, amount: r.credits_cost, createdAt: r.created_at,
        })))
      }
      // Sort all by date descending and limit
      receivedRequests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      receivedRequests = receivedRequests.slice(0, 10)
    }

    // Get sent requests (by this wallet)
    const sentRows = await sql`SELECT r.*, a.name as agent_name FROM requests r JOIN agents a ON r.agent_id = a.id WHERE r.user_wallet = ${wallet} ORDER BY r.created_at DESC LIMIT 10`
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
  } catch (err: any) {
    console.error('Dashboard error:', err)
    return NextResponse.json({ error: 'Failed to load dashboard' }, { status: 500 })
  }
}
