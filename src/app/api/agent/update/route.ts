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

    // Verify ownership
    const agent = await getAgentById(agentId)
    if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    if (agent.ownerWallet !== wallet) {
      return NextResponse.json({ error: 'Unauthorized. You are not the owner of this agent.' }, { status: 403 })
    }

    // Build update query
    const sql = neon(process.env.DATABASE_URL!)
    const allowedFields: Record<string, string> = {
      name: 'name',
      description: 'description',
      price: 'price',
      endpoint: 'endpoint',
      isActive: 'is_active',
    }

    for (const [key, value] of Object.entries(updates || {})) {
      const dbField = allowedFields[key]
      if (!dbField) continue

      if (key === 'name') {
        if (typeof value !== 'string' || value.length > 32 || value.length === 0) continue
        await sql`UPDATE agents SET name = ${value as string} WHERE id = ${agentId}`
      } else if (key === 'description') {
        await sql`UPDATE agents SET description = ${value as string} WHERE id = ${agentId}`
      } else if (key === 'price') {
        const price = parseFloat(value as string)
        if (isNaN(price) || price < 0) continue
        await sql`UPDATE agents SET price = ${price} WHERE id = ${agentId}`
      } else if (key === 'endpoint') {
        if (typeof value !== 'string' || !value.startsWith('http')) continue
        await sql`UPDATE agents SET endpoint = ${value as string} WHERE id = ${agentId}`
      } else if (key === 'isActive') {
        await sql`UPDATE agents SET is_active = ${Boolean(value)} WHERE id = ${agentId}`
      }
    }

    const updated = await getAgentById(agentId)
    return NextResponse.json({ success: true, agent: updated })
  } catch {
    return NextResponse.json({ error: 'Failed to update agent' }, { status: 500 })
  }
}
