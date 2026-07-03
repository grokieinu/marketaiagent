import { NextRequest, NextResponse } from 'next/server'
import { getAgentById } from '@/lib/db'
import { neon } from '@neondatabase/serverless'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { agentId, wallet, updates } = body

    if (!agentId || !wallet) {
      return NextResponse.json({ error: 'Missing agentId or wallet' }, { status: 400 })
    }

    if (!updates || Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 })
    }

    // Verify ownership
    const agent = await getAgentById(agentId)
    if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    if (agent.ownerWallet !== wallet) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const sql = neon(process.env.DATABASE_URL!)

    // Update each field individually
    if (updates.name !== undefined && typeof updates.name === 'string' && updates.name.length > 0 && updates.name.length <= 32) {
      await sql`UPDATE agents SET name = ${updates.name} WHERE id = ${agentId}`
    }

    if (updates.description !== undefined && typeof updates.description === 'string') {
      await sql`UPDATE agents SET description = ${updates.description} WHERE id = ${agentId}`
    }

    if (updates.price !== undefined) {
      const price = Number(String(updates.price).replace(',', '.'))
      if (!isNaN(price) && price >= 0) {
        await sql`UPDATE agents SET price = ${price} WHERE id = ${agentId}`
      }
    }

    if (updates.endpoint !== undefined && typeof updates.endpoint === 'string' && updates.endpoint.startsWith('http')) {
      await sql`UPDATE agents SET endpoint = ${updates.endpoint} WHERE id = ${agentId}`
    }

    if (updates.isActive !== undefined) {
      if (updates.isActive === true || updates.isActive === 'true') {
        await sql`UPDATE agents SET is_active = true WHERE id = ${agentId}`
      } else {
        await sql`UPDATE agents SET is_active = false WHERE id = ${agentId}`
      }
    }

    const updated = await getAgentById(agentId)
    return NextResponse.json({ success: true, agent: updated })
  } catch (err: any) {
    console.error('Update agent error:', err)
    return NextResponse.json({ error: err.message || 'Failed to update agent' }, { status: 500 })
  }
}
