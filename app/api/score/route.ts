import { NextRequest, NextResponse } from 'next/server'
import { scoreSegments } from '@/lib/score'
import type { TranscriptSegment } from '@/lib/transcribe'
import { AI_LIMITER } from '@/lib/rateLimit'

export const maxDuration = 30

export async function POST(req: NextRequest) {
  const limited = AI_LIMITER.check(req)
  if (limited) return limited

  try {
    const body = (await req.json()) as {
      segments?: TranscriptSegment[]
      context?: { podcastTitle?: string; hostName?: string }
    }

    if (!Array.isArray(body.segments) || body.segments.length === 0) {
      return NextResponse.json({ error: 'segments array required' }, { status: 400 })
    }

    if (body.segments.length > 500) {
      return NextResponse.json({ error: 'Too many segments (max 500)' }, { status: 400 })
    }

    const scored = await scoreSegments(body.segments, body.context ?? {})
    return NextResponse.json({ segments: scored })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    console.error('[clipforge-ai][score]', msg)
    return NextResponse.json({ error: msg.slice(0, 200) }, { status: 500 })
  }
}
