import { NextRequest, NextResponse } from 'next/server'

// Fix SSL for local development
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

/**
 * Agent Health Check
 * Simple check: if endpoint responds at all (any status), it's online.
 * Only mark as offline if network error / timeout.
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { agentEndpoint } = body

    if (!agentEndpoint) {
      return NextResponse.json({ error: 'Missing agentEndpoint' }, { status: 400 })
    }

    const startTime = Date.now()

    try {
      // Just try to reach the endpoint — any response = online
      const res = await fetch(agentEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'ping', message: 'ping' }),
        signal: AbortSignal.timeout(20000),
      })

      const latency = Date.now() - startTime

      // If we get ANY response (even 4xx/5xx), the server is reachable = online
      return NextResponse.json({
        success: true,
        healthy: true,
        latency,
        status: res.status,
      })
    } catch (fetchError: any) {
      const latency = Date.now() - startTime

      // Network error or timeout = offline
      return NextResponse.json({
        success: true,
        healthy: false,
        latency,
        error: fetchError.cause?.code || fetchError.message || 'Connection failed',
      })
    }
  } catch {
    return NextResponse.json({ error: 'Health check failed' }, { status: 500 })
  }
}
