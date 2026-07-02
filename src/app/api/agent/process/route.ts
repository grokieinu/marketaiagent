import { NextRequest, NextResponse } from 'next/server'
import { getAgentById, createRequest, getUserCredits, spendCredits, addCredits } from '@/lib/db'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

/**
 * Agent Process API
 * 
 * Sends standard OpenAI-compatible format to creator endpoint:
 * 
 * {
 *   "messages": [
 *     {"role": "user", "content": "hello"},
 *     {"role": "assistant", "content": "...previous..."},
 *     {"role": "user", "content": "edit this part"}
 *   ]
 * }
 * 
 * This is the same format used by OpenAI, Claude, Gemini, DeepSeek, etc.
 * Creator just forwards this to their AI model — zero extra work.
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { prompt, agentId, userWallet, attachments, previousResponse } = body

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

    // Check endpoint
    if (!agent.endpoint) return NextResponse.json({ error: 'Agent has no endpoint' }, { status: 400 })

    try {
      await fetch(agent.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: 'ping' }] }),
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
          error: `Insufficient credits.`, needCredits: true,
          required: agent.price, available: result.remaining,
        }, { status: 402 })
      }
    }

    // Build OpenAI-compatible messages array
    const messages: { role: string; content: any }[] = []

    // Add previous response as context (for edit/refine)
    if (previousResponse) {
      messages.push({ role: 'assistant', content: previousResponse })
    }

    // Build user message content
    if (attachments && attachments.length > 0) {
      // Multimodal format: array of content parts
      const content: any[] = [{ type: 'text', text: prompt }]

      for (const file of attachments) {
        if (file.type.startsWith('image/')) {
          // Images: send as base64 image_url (OpenAI Vision format)
          content.push({
            type: 'image_url',
            image_url: { url: `data:${file.type};base64,${file.data}` }
          })
        } else if (file.type.startsWith('video/') || file.type.startsWith('audio/')) {
          // Video/Audio: send as base64 data URL
          content.push({
            type: 'file',
            file: { name: file.name, type: file.type, data: `data:${file.type};base64,${file.data}` }
          })
        } else {
          // Documents, code, text: decode base64 to text and include inline
          let textContent = ''
          try {
            textContent = Buffer.from(file.data, 'base64').toString('utf-8')
          } catch {
            textContent = `[Binary file: ${file.name}]`
          }
          content.push({
            type: 'text',
            text: `\n--- File: ${file.name} ---\n${textContent}\n--- End of ${file.name} ---\n`
          })
        }
      }

      messages.push({ role: 'user', content })
    } else {
      messages.push({ role: 'user', content: prompt })
    }

    // Relay to creator endpoint — standard OpenAI format
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
          // Accept any common response format
          agentResponse = data.response
            || data.content
            || data.message
            || data.result
            || data.text
            || (data.choices && data.choices[0]?.message?.content)
            || (data.choices && data.choices[0]?.text)
            || ''
          if (typeof agentResponse === 'object') agentResponse = JSON.stringify(agentResponse)
        } else {
          agentResponse = await res.text()
        }
      } else {
        if (agent.price > 0 && userWallet) await addCredits(userWallet, agent.price, 0, null)
        return NextResponse.json({ error: `Agent error (${res.status}). Credits refunded.` }, { status: 502 })
      }
    } catch {
      if (agent.price > 0 && userWallet) await addCredits(userWallet, agent.price, 0, null)
      return NextResponse.json({ error: 'Agent failed. Credits refunded.' }, { status: 502 })
    }

    if (!agentResponse) {
      if (agent.price > 0 && userWallet) await addCredits(userWallet, agent.price, 0, null)
      return NextResponse.json({ error: 'Empty response. Credits refunded.' }, { status: 502 })
    }

    // Save
    await createRequest({ agentId: agent.id, prompt, response: agentResponse, userWallet: userWallet || null, creditsCost: agent.price })
    const updatedCredits = userWallet ? await getUserCredits(userWallet) : null

    return NextResponse.json({
      success: true, response: agentResponse,
      creditsRemaining: updatedCredits?.balance ?? null,
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
