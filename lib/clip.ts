import type { ScoredSegment } from './score'

export interface ClipGenerationInput {
  segment: ScoredSegment
  aspectRatio: '9:16' | '16:9' | '1:1'
  durationSeconds?: number
}

export interface ClipResult {
  url: string
  provider: 'kling' | 'pika'
  aspectRatio: string
  durationSeconds: number
  hookLine: string
  clipTitle: string
}

// Build a cinematic text-to-video prompt from transcript text
function buildVisualPrompt(segment: ScoredSegment): string {
  const hook = segment.hookLine.slice(0, 100)
  const snippet = segment.text.slice(0, 150).replace(/["""]/g, "'")
  return (
    `Podcast talking head scene. Speaker looking directly at camera, confident and engaged. ` +
    `Large bold subtitle text: "${hook}". ` +
    `Clean modern background, shallow depth of field, professional lighting. ` +
    `Context: "${snippet}". ` +
    `Cinematic, high quality, social media format.`
  )
}

async function pollFalQueue(
  requestId: string,
  appId: string,
  apiKey: string,
  timeoutMs = 180_000,
): Promise<string> {
  const deadline = Date.now() + timeoutMs
  const statusBase = `https://queue.fal.run/${appId}/requests/${requestId}`

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 4_000))

    const statusRes = await fetch(`${statusBase}/status`, {
      headers: { Authorization: `Key ${apiKey}` },
    })

    if (!statusRes.ok) {
      const err = await statusRes.text()
      throw new Error(`fal.ai status ${statusRes.status}: ${err.slice(0, 200)}`)
    }

    const status = (await statusRes.json()) as { status: string; error?: string }

    if (status.status === 'COMPLETED') {
      const resultRes = await fetch(statusBase, {
        headers: { Authorization: `Key ${apiKey}` },
      })
      if (!resultRes.ok) throw new Error(`fal.ai result ${resultRes.status}`)
      const result = (await resultRes.json()) as {
        video?: { url: string }
        videos?: Array<{ url: string }>
        output?: { video?: { url: string } }
      }
      const url =
        result.video?.url ??
        result.videos?.[0]?.url ??
        result.output?.video?.url
      if (!url) throw new Error('fal.ai returned no video URL')
      return url
    }

    if (status.status === 'FAILED') {
      throw new Error(`fal.ai generation failed: ${status.error ?? 'unknown'}`)
    }
    // IN_QUEUE or IN_PROGRESS — keep polling
  }

  throw new Error('fal.ai generation timed out after 3 minutes')
}

async function generateViaKling(
  input: ClipGenerationInput,
  apiKey: string,
): Promise<string> {
  const appId = 'fal-ai/kling-video/v1.6/standard/text-to-video'
  const prompt = buildVisualPrompt(input.segment)

  const submitRes = await fetch(`https://queue.fal.run/${appId}`, {
    method: 'POST',
    headers: {
      Authorization: `Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      duration: String(Math.min(input.durationSeconds ?? 5, 10)),
      aspect_ratio: input.aspectRatio,
      negative_prompt: 'blurry, low quality, watermark, text overlay',
    }),
  })

  if (!submitRes.ok) {
    const err = await submitRes.text()
    throw new Error(`Kling submit ${submitRes.status}: ${err.slice(0, 200)}`)
  }

  const submission = (await submitRes.json()) as { request_id: string }
  return pollFalQueue(submission.request_id, appId, apiKey)
}

async function generateViaPika(
  input: ClipGenerationInput,
  apiKey: string,
): Promise<string> {
  const appId = 'fal-ai/pika/v2.2/text-to-video'
  const prompt = buildVisualPrompt(input.segment)

  const submitRes = await fetch(`https://queue.fal.run/${appId}`, {
    method: 'POST',
    headers: {
      Authorization: `Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      aspect_ratio: input.aspectRatio,
      duration: Math.min(input.durationSeconds ?? 5, 8),
    }),
  })

  if (!submitRes.ok) {
    const err = await submitRes.text()
    throw new Error(`Pika submit ${submitRes.status}: ${err.slice(0, 200)}`)
  }

  const submission = (await submitRes.json()) as { request_id: string }
  return pollFalQueue(submission.request_id, appId, apiKey)
}

export async function generatePodcastClip(
  input: ClipGenerationInput,
): Promise<ClipResult> {
  const apiKey = process.env.FAL_KEY
  if (!apiKey) throw new Error('FAL_KEY not configured')

  const duration = Math.min(
    input.durationSeconds ?? Math.round(input.segment.end - input.segment.start),
    10,
  )

  // Try Kling first (better quality)
  try {
    const url = await generateViaKling(input, apiKey)
    return {
      url,
      provider: 'kling',
      aspectRatio: input.aspectRatio,
      durationSeconds: duration,
      hookLine: input.segment.hookLine,
      clipTitle: input.segment.clipTitle,
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.warn('[clip] Kling failed, trying Pika:', msg)
  }

  // Pika fallback
  const url = await generateViaPika(input, apiKey)
  return {
    url,
    provider: 'pika',
    aspectRatio: input.aspectRatio,
    durationSeconds: duration,
    hookLine: input.segment.hookLine,
    clipTitle: input.segment.clipTitle,
  }
}
