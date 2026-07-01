import { NextRequest, NextResponse } from 'next/server'
import { getAgentById, createRequest, getUserCredits, spendCredits, addCredits } from '@/lib/db'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { prompt, agentId, userWallet } = body

    if (!prompt) return NextResponse.json({ error: 'Missing prompt' }, { status: 400 })
    if (!agentId) return NextResponse.json({ error: 'Missing agentId' }, { status: 400 })

    const agent = await getAgentById(agentId)
    if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    if (!agent.isActive) return NextResponse.json({ error: 'Agent is not active' }, { status: 400 })

    // Check credits for paid agents
    if (agent.price > 0) {
      if (!userWallet) return NextResponse.json({ error: 'Wallet required for paid agents' }, { status: 402 })
      const userCredits = await getUserCredits(userWallet)
      if (userCredits.balance < agent.price) {
        return NextResponse.json({
          error: `Insufficient credits. Need ${agent.price}, have ${userCredits.balance}.`,
          needCredits: true, required: agent.price, available: userCredits.balance,
        }, { status: 402 })
      }
    }

    // Check endpoint reachable
    if (!agent.endpoint) return NextResponse.json({ error: 'Agent has no endpoint configured' }, { status: 400 })

    try {
      await fetch(agent.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'ping', message: 'ping' }),
        signal: AbortSignal.timeout(10000),
      })
    } catch {
      return NextResponse.json({ error: 'Agent endpoint is offline. No credits deducted.' }, { status: 503 })
    }

    // Deduct credits
    if (agent.price > 0 && userWallet) {
      const result = await spendCredits(userWallet, agent.price)
      if (!result.success) {
        return NextResponse.json({
          error: `Insufficient credits. Need ${agent.price}, have ${result.remaining}.`,
          needCredits: true, required: agent.price, available: result.remaining,
        }, { status: 402 })
      }
    }

    // Relay to endpoint
    let agentResponse = ''
    try {
      const res = await fetch(agent.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt, message: prompt,
          messages: [{ role: 'user', content: prompt }],
          requestId: `req_${Date.now()}`, timestamp: Date.now(),
        }),
        signal: AbortSignal.timeout(60000),
      })

      if (res.ok) {
        const contentType = res.headers.get('content-type') || ''
        if (contentType.includes('application/json')) {
          const data = await res.json()
          agentResponse = data.response || data.content || data.message || data.result || data.text || data.answer || data.reply
            || (data.choices && data.choices[0]?.message?.content)
            || (data.choices && data.choices[0]?.text) || ''
          if (typeof agentResponse === 'object') agentResponse = JSON.stringify(agentResponse)
        } else {
          agentResponse = await res.text()
        }
      } else {
        if (agent.price > 0 && userWallet) await addCredits(userWallet, agent.price, 0, null)
        return NextResponse.json({ error: `Agent error (${res.status}). Credits refunded.` }, { status: 502 })
      }
    } catch (err: any) {
      if (agent.price > 0 && userWallet) await addCredits(userWallet, agent.price, 0, null)
      return NextResponse.json({ error: 'Agent failed. Credits refunded.' }, { status: 502 })
    }

    if (!agentResponse) {
      if (agent.price > 0 && userWallet) await addCredits(userWallet, agent.price, 0, null)
      return NextResponse.json({ error: 'Empty response. Credits refunded.' }, { status: 502 })
    }

    // Save request
    await createRequest({ agentId: agent.id, prompt, response: agentResponse, userWallet: userWallet || null, creditsCost: agent.price })

    const updatedCredits = userWallet ? await getUserCredits(userWallet) : null

    return NextResponse.json({
      success: true, response: agentResponse,
      agent: { name: agent.name, price: agent.price },
      creditsRemaining: updatedCredits?.balance ?? null,
      timestamp: Date.now(),
    })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
