import { NextRequest, NextResponse } from 'next/server'
import { aiChat } from '@/lib/ai'
import { AI_LIMITER } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const limited = AI_LIMITER.check(req)
  if (limited) return limited

  try {
    const { messages } = await req.json()
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'messages required' }, { status: 400 })
    }
    const reply = await aiChat(messages)
    return NextResponse.json({ reply })
  } catch (err) {
    console.error('/api/chat error:', err)
    return NextResponse.json({ reply: 'Sorry, I had trouble responding. Please try again in a moment.' }, { status: 200 })
  }
}
