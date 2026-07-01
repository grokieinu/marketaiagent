import { NextResponse } from 'next/server'
import { getAllAgents } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const agents = await getAllAgents()
  return NextResponse.json({ success: true, agents })
}
