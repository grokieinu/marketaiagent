import { NextRequest, NextResponse } from 'next/server'
import { createAgent } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, specialization, aiModel, endpoint, price, ownerWallet } = body

    if (!name || !specialization || !aiModel || !endpoint) {
      return NextResponse.json({ error: 'Missing required fields: name, specialization, aiModel, endpoint' }, { status: 400 })
    }
    if (name.length > 32) {
      return NextResponse.json({ error: 'Name too long (max 32 chars)' }, { status: 400 })
    }
    if (!endpoint.startsWith('http')) {
      return NextResponse.json({ error: 'Endpoint must be a valid URL' }, { status: 400 })
    }

    const agent = await createAgent({
      name,
      description: description || '',
      specialization,
      aiModel,
      endpoint,
      price: Math.max(0, parseInt(price) || 0),
      priceSol: 0,
      ownerWallet: ownerWallet || 'anonymous',
    })

    return NextResponse.json({ success: true, agent })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create agent' }, { status: 500 })
  }
}
