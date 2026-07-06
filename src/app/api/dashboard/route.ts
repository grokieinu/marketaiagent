import { NextRequest, NextResponse } from 'next/server'
import { getAgentsByOwner } from '@/lib/db'
import { MongoClient } from 'mongodb'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get('wallet')
  if (!wallet) return NextResponse.json({ error: 'Wallet required' }, { status: 400 })

  try {
    const client = new MongoClient(process.env.MONGODB_URI!)
    await client.connect()
    const db = client.db('grokie')

    const myAgents = await getAgentsByOwner(wallet)
    const myAgentIds = myAgents.map((a) => a.id)

    // Received requests
    let receivedRequests: any[] = []
    if (myAgentIds.length > 0) {
      const rows = await db.collection('requests').find({ agentId: { $in: myAgentIds } }).sort({ createdAt: -1 }).limit(10).toArray()
      // Get agent names
      const agentMap: Record<string, string> = {}
      myAgents.forEach(a => { agentMap[a.id] = a.name })
      receivedRequests = rows.map((r: any) => ({
        id: r.id, agentId: r.agentId, agentName: agentMap[r.agentId] || 'Unknown',
        prompt: r.prompt, amount: r.creditsCost || 0, createdAt: r.createdAt,
      }))
    }

    // Sent requests
    const sentRows = await db.collection('requests').find({ userWallet: wallet }).sort({ createdAt: -1 }).limit(10).toArray()
    const allAgents = await db.collection('agents').find({}).toArray()
    const nameMap: Record<string, string> = {}
    allAgents.forEach((a: any) => { nameMap[a.id] = a.name })
    const sentRequests = sentRows.map((r: any) => ({
      id: r.id, agentId: r.agentId, agentName: nameMap[r.agentId] || 'Unknown',
      prompt: r.prompt, amount: r.creditsCost || 0, createdAt: r.createdAt,
    }))

    const totalEarnings = myAgents.reduce((sum, a) => sum + a.totalEarnings, 0)
    const totalRequests = myAgents.reduce((sum, a) => sum + a.totalRequests, 0)

    await client.close()

    return NextResponse.json({
      success: true, myAgents, receivedRequests, sentRequests,
      stats: { totalAgents: myAgents.length, totalEarnings, totalRequests, totalSent: sentRequests.length },
    })
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to load dashboard' }, { status: 500 })
  }
}
