/**
 * POST /api/generate
 * Body: { prompt: string, duration?: number, aspectRatio?: string }
 * Response: { videoUrl, enhancedPrompt, provider, durationSeconds }
 *
 * Pipeline:
 * 1. callAI() (Groq free) → expand user prompt into cinematic video prompt
 * 2. generateVideo() (HF free → Replicate paid fallback) → video URL
 */
import { NextRequest, NextResponse } from 'next/server'
import { callAI } from '@/lib/ai'
import { generateVideo } from '@/lib/video'
import config from '@/vertical.config'

export const maxDuration = 180 // 3 min — HF inference can be slow

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      prompt?: string
      duration?: number
      aspectRatio?: string
    }

    const userPrompt = (body.prompt ?? '').trim()
    if (!userPrompt || userPrompt.length < 3) {
      return NextResponse.json({ error: 'Prompt too short' }, { status: 400 })
    }
    if (userPrompt.length > 500) {
      return NextResponse.json({ error: 'Prompt too long (max 500 chars)' }, { status: 400 })
    }

    const duration = Math.min(Math.max(body.duration ?? config.defaultDuration, 3), config.maxDuration)
    const aspectRatio = body.aspectRatio ?? '16:9'

    // Step 1 — enhance prompt with AI (free, Groq)
    let enhancedPrompt = userPrompt
    try {
      const aiRes = await callAI(
        config.aiSystemPrompt,
        [{ role: 'user', content: `Enhance this into a cinematic video prompt: "${userPrompt}"` }],
        200,
        'fast',
      )
      if (aiRes.text) enhancedPrompt = aiRes.text.trim()
    } catch (e: any) {
      console.warn('[generate] AI prompt enhancement failed, using raw prompt:', e.message)
    }

    // Step 2 — generate video
    const result = await generateVideo(enhancedPrompt, duration, aspectRatio)

    return NextResponse.json({
      videoUrl: result.url,
      enhancedPrompt,
      originalPrompt: userPrompt,
      provider: result.provider,
      durationSeconds: result.durationSeconds,
      aspectRatio,
    })
  } catch (e: any) {
    console.error('[generate] Error:', e)
    const msg = (e.message ?? 'Unknown error').slice(0, 200)
    const isProviderError = msg.toLowerCase().includes('not configured') || msg.toLowerCase().includes('no video provider')
    return NextResponse.json(
      { error: isProviderError ? 'Video generation is not configured on this server.' : `Generation failed: ${msg}` },
      { status: 500 },
    )
  }
}
