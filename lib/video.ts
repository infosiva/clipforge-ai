/**
 * lib/video.ts — Video generation client
 *
 * Free tier: Hugging Face Inference API (rate-limited, free)
 *   Model: stabilityai/stable-video-diffusion-img2vid (image-to-video via HF)
 *   Or:    ali-vilab/text-to-video-ms-1.7b (T2V, smaller model)
 *   HF_TOKEN env var → free at huggingface.co/settings/tokens
 *
 * Paid fallback: Replicate (pay-per-run, cheap for Wan models)
 *   REPLICATE_API_TOKEN env var
 *   Model: wan-video/wan2.1-t2v-480p
 *
 * Strategy: HF first → if HF busy/error → try Replicate
 */

export interface VideoResult {
  url: string
  provider: 'huggingface' | 'replicate' | 'mock'
  prompt: string
  durationSeconds: number
}

const HF_T2V_MODEL = 'ali-vilab/text-to-video-ms-1.7b'
const REPLICATE_MODEL = 'wan-video/wan2.1-t2v-480p'

// ── Hugging Face text-to-video ────────────────────────────────────────────────
async function generateViaHuggingFace(
  prompt: string,
  durationSeconds: number,
): Promise<string> {
  const token = process.env.HF_TOKEN
  if (!token) throw new Error('HF_TOKEN not configured')

  const endpoint = `https://api-inference.huggingface.co/models/${HF_T2V_MODEL}`

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: {
        num_frames: Math.min(durationSeconds * 8, 24), // ~8fps, max 24 frames
      },
    }),
    signal: AbortSignal.timeout(120_000), // HF can be slow
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`HuggingFace ${res.status}: ${err.slice(0, 200)}`)
  }

  // HF returns binary video — upload to a temp URL or return as base64
  // For now we get the blob and convert to a data URL (works for short clips)
  const blob = await res.blob()
  const buffer = await blob.arrayBuffer()
  const base64 = Buffer.from(buffer).toString('base64')
  const mimeType = blob.type || 'video/mp4'
  return `data:${mimeType};base64,${base64}`
}

// ── Replicate text-to-video (paid, cheap) ─────────────────────────────────────
async function generateViaReplicate(
  prompt: string,
  durationSeconds: number,
  aspectRatio: string,
): Promise<string> {
  const token = process.env.REPLICATE_API_TOKEN
  if (!token) throw new Error('REPLICATE_API_TOKEN not configured')

  // Create prediction
  const createRes = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      version: 'wan-video/wan2.1-t2v-480p',
      input: {
        prompt,
        num_frames: Math.min(durationSeconds * 16, 81),
        aspect_ratio: aspectRatio,
      },
    }),
  })

  if (!createRes.ok) {
    const err = await createRes.text()
    throw new Error(`Replicate create ${createRes.status}: ${err.slice(0, 200)}`)
  }

  const prediction = (await createRes.json()) as { id: string; status: string; output?: string; urls?: { get: string } }

  // Poll until done (max 3 minutes)
  const pollUrl = `https://api.replicate.com/v1/predictions/${prediction.id}`
  const deadline = Date.now() + 180_000

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 3000))
    const pollRes = await fetch(pollUrl, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = (await pollRes.json()) as { status: string; output?: string[] | string; error?: string }
    if (data.status === 'succeeded') {
      const output = Array.isArray(data.output) ? data.output[0] : data.output
      if (!output) throw new Error('Replicate returned empty output')
      return output
    }
    if (data.status === 'failed') {
      throw new Error(`Replicate failed: ${data.error}`)
    }
  }
  throw new Error('Replicate prediction timed out after 3 minutes')
}

// ── Public API ────────────────────────────────────────────────────────────────
export async function generateVideo(
  prompt: string,
  durationSeconds = 5,
  aspectRatio = '16:9',
): Promise<VideoResult> {
  // Try HF first (free)
  if (process.env.HF_TOKEN) {
    try {
      const url = await generateViaHuggingFace(prompt, durationSeconds)
      return { url, provider: 'huggingface', prompt, durationSeconds }
    } catch (e: any) {
      console.warn('[video] HuggingFace failed, trying Replicate:', e.message)
    }
  }

  // Try Replicate (paid but cheap)
  if (process.env.REPLICATE_API_TOKEN) {
    try {
      const url = await generateViaReplicate(prompt, durationSeconds, aspectRatio)
      return { url, provider: 'replicate', prompt, durationSeconds }
    } catch (e: any) {
      console.warn('[video] Replicate failed:', e.message)
      throw e
    }
  }

  throw new Error('No video provider configured. Set HF_TOKEN or REPLICATE_API_TOKEN in environment.')
}
