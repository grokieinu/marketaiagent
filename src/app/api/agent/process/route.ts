import { NextRequest, NextResponse } from 'next/server'
import { getAgentById, createRequest } from '@/lib/db'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

/**
 * Agent Process API — Direct SOL Payment
 * 
 * Free agents: relay directly, no payment.
 * Paid agents: user pays SOL on-chain BEFORE calling this API.
 *   - 90% goes to creator wallet
 *   - 10% goes to platform treasury
 *   - Frontend handles the Solana transaction
 *   - This API receives the tx signature as proof
 * 
 * Flow:
 * 1. Frontend sends SOL (90% creator + 10% treasury)
 * 2. Frontend calls this API with txSignature
 * 3. API verifies agent is online, relays prompt
 * 4. Returns response
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { prompt, agentId, userWallet, txSignature, attachments, previousResponse } = body

    if (!prompt) return NextResponse.json({ error: 'Missing prompt' }, { status: 400 })
    if (!agentId) return NextResponse.json({ error: 'Missing agentId' }, { status: 400 })

    const agent = await getAgentById(agentId)
    if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    if (!agent.isActive) return NextResponse.json({ error: 'Agent is not active' }, { status: 400 })

    // For paid agents: deduct from user balance (no wallet popup needed)
    if (agent.price > 0) {
      if (!userWallet) return NextResponse.json({ error: 'Wallet required for paid agents' }, { status: 402 })
      
      // Check and deduct from deposited balance
      const { MongoClient } = await import('mongodb')
      const client = new MongoClient(process.env.MONGODB_URI!)
      await client.connect()
      const mdb = client.db('grokie')

      const user = await mdb.collection('user_balances').findOne({ wallet: userWallet })
      const balance = user?.balance || 0

      if (balance < agent.price) {
        await client.close()
        return NextResponse.json({ 
          error: `Insufficient balance. Need ${agent.price} SOL, have ${balance.toFixed(4)} SOL. Please deposit more in Dashboard → Wallet.`,
          needDeposit: true, required: agent.price, available: balance,
        }, { status: 402 })
      }

      // Deduct from user
      await mdb.collection('user_balances').updateOne({ wallet: userWallet }, { $inc: { balance: -agent.price } })

      // Credit creator (90%)
      const creatorShare = agent.price * 0.9
      await mdb.collection('creator_earnings').updateOne(
        { wallet: agent.ownerWallet },
        { $inc: { earnings: creatorShare, totalEarned: creatorShare }, $setOnInsert: { wallet: agent.ownerWallet } },
        { upsert: true }
      )
      await client.close()
    }

    // Check endpoint is reachable
    if (!agent.endpoint) return NextResponse.json({ error: 'Agent has no endpoint' }, { status: 400 })

    try {
      await fetch(agent.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: 'ping' }] }),
        signal: AbortSignal.timeout(10000),
      })
    } catch {
      return NextResponse.json({ error: 'Agent endpoint is offline.' }, { status: 503 })
    }

    // Build OpenAI-compatible messages array
    const messages: { role: string; content: any }[] = []

    if (previousResponse) {
      messages.push({ role: 'assistant', content: previousResponse })
    }

    if (attachments && attachments.length > 0) {
      const content: any[] = [{ type: 'text', text: prompt }]
      for (const file of attachments) {
        if (file.type.startsWith('image/')) {
          content.push({ type: 'image_url', image_url: { url: `data:${file.type};base64,${file.data}` } })
        } else if (file.type.startsWith('video/') || file.type.startsWith('audio/')) {
          content.push({ type: 'file', file: { name: file.name, type: file.type, data: `data:${file.type};base64,${file.data}` } })
        } else {
          let textContent = ''
          try { textContent = Buffer.from(file.data, 'base64').toString('utf-8') } catch { textContent = `[Binary: ${file.name}]` }
          content.push({ type: 'text', text: `\n--- File: ${file.name} ---\n${textContent}\n--- End ---\n` })
        }
      }
      messages.push({ role: 'user', content })
    } else {
      messages.push({ role: 'user', content: prompt })
    }

    // Relay to creator endpoint
    let agentResponse = ''
    try {
      const res = await fetch(agent.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
        signal: AbortSignal.timeout(60000),
      })

      if (res.ok) {
        const contentType = res.headers.get('content-type') || ''
        if (contentType.includes('application/json')) {
          const data = await res.json()
          agentResponse = data.response || data.content || data.message || data.result || data.text
            || (data.choices && data.choices[0]?.message?.content) || (data.choices && data.choices[0]?.text) || ''
          if (typeof agentResponse === 'object') agentResponse = JSON.stringify(agentResponse)
        } else if (contentType.includes('text/html')) {
          return NextResponse.json({ error: 'Agent returned HTML instead of JSON. Check endpoint configuration.' }, { status: 502 })
        } else {
          agentResponse = await res.text()
        }
      } else {
        return NextResponse.json({ error: `Agent error (${res.status}).` }, { status: 502 })
      }
    } catch {
      return NextResponse.json({ error: 'Agent failed to respond.' }, { status: 502 })
    }

    if (!agentResponse) {
      return NextResponse.json({ error: 'Agent returned empty response.' }, { status: 502 })
    }

    // Save request to database
    await createRequest({ agentId: agent.id, prompt, response: agentResponse, userWallet: userWallet || null, creditsCost: agent.price })

    return NextResponse.json({ success: true, response: agentResponse })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
