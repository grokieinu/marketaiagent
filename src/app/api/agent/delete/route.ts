import { NextRequest, NextResponse } from 'next/server'
import { getAgentById } from '@/lib/db'
import { MongoClient } from 'mongodb'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { agentId, wallet } = body

    if (!agentId || !wallet) return NextResponse.json({ error: 'Missing agentId or wallet' }, { status: 400 })

    const agent = await getAgentById(agentId)
    if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    if (agent.ownerWallet !== wallet) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

    const client = new MongoClient(process.env.MONGODB_URI!)
    await client.connect()
    const db = client.db('grokie')

    await db.collection('agents').deleteOne({ id: agentId })
    await client.close()

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete' }, { status: 500 })
  }
}
