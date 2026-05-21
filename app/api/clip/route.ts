import { NextRequest, NextResponse } from 'next/server'
import { generatePodcastClip } from '@/lib/clip'
import { checkUsage, incrementUsage, saveClipToDb, makeUserKey } from '@/lib/usage'
import type { ScoredSegment } from '@/lib/score'

export const maxDuration = 180

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      segment?: ScoredSegment
      aspectRatio?: string
      durationSeconds?: number
    }

    if (!body.segment) {
      return NextResponse.json({ error: 'segment required' }, { status: 400 })
    }

    // Build anonymous user key from IP + UA
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      req.headers.get('x-real-ip') ??
      'unknown'
    const ua = req.headers.get('user-agent') ?? ''
    const userKey = makeUserKey(ip, ua)

    // Freemium gate
    const usage = await checkUsage(userKey)
    if (!usage.allowed) {
      return NextResponse.json(
        {
          error: 'Free clip limit reached. Upgrade to continue.',
          upgradeRequired: true,
          remaining: 0,
        },
        { status: 429 },
      )
    }

    const aspectRatio = (['9:16', '16:9', '1:1'].includes(body.aspectRatio ?? '')
      ? body.aspectRatio!
      : '9:16') as '9:16' | '16:9' | '1:1'

    const result = await generatePodcastClip({
      segment: body.segment,
      aspectRatio,
      durationSeconds: body.durationSeconds,
    })

    // Increment usage + save clip (both non-blocking on error)
    await Promise.all([
      incrementUsage(userKey),
      saveClipToDb({
        user_key: userKey,
        clip_title: result.clipTitle,
        hook_line: result.hookLine,
        transcript_text: body.segment.text,
        video_url: result.url,
        provider: result.provider,
        duration_seconds: result.durationSeconds,
        aspect_ratio: result.aspectRatio,
        virality_score: body.segment.viralityScore,
      }),
    ])

    return NextResponse.json({
      ...result,
      remaining: Math.max(0, usage.remaining - 1),
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    console.error('[clip] Error:', msg)
    const isProvider = msg.toLowerCase().includes('not configured') || msg.toLowerCase().includes('timed out')
    return NextResponse.json(
      { error: isProvider ? 'Video generation is not available.' : `Clip generation failed: ${msg.slice(0, 150)}` },
      { status: 500 },
    )
  }
}
