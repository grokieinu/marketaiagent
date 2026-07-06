import { NextRequest, NextResponse } from 'next/server'
import { getAgentById } from '@/lib/db'
import { MongoClient } from 'mongodb'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { agentId, wallet, updates } = body

    if (!agentId || !wallet) return NextResponse.json({ error: 'Missing agentId or wallet' }, { status: 400 })
    if (!updates || Object.keys(updates).length === 0) return NextResponse.json({ error: 'No updates' }, { status: 400 })

    const agent = await getAgentById(agentId)
    if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    if (agent.ownerWallet !== wallet) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

    const client = new MongoClient(process.env.MONGODB_URI!)
    await client.connect()
    const db = client.db('grokie')

    const updateDoc: any = {}

    if (updates.name !== undefined && typeof updates.name === 'string' && updates.name.length > 0 && updates.name.length <= 32) {
      updateDoc.name = updates.name
    }
    if (updates.description !== undefined && typeof updates.description === 'string') {
      updateDoc.description = updates.description
    }
    if (updates.price !== undefined) {
      const price = Number(String(updates.price).replace(',', '.'))
      if (!isNaN(price) && price >= 0) updateDoc.price = price
    }
    if (updates.endpoint !== undefined && typeof updates.endpoint === 'string' && updates.endpoint.startsWith('http')) {
      updateDoc.endpoint = updates.endpoint
    }
    if (updates.isActive !== undefined) {
      updateDoc.isActive = updates.isActive === true || updates.isActive === 'true'
    }

    if (Object.keys(updateDoc).length > 0) {
      await db.collection('agents').updateOne({ id: agentId }, { $set: updateDoc })
    }

    await client.close()
    const updated = await getAgentById(agentId)
    return NextResponse.json({ success: true, agent: updated })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed' }, { status: 500 })
  }
}
