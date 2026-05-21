export interface TranscriptSegment {
  id: number
  start: number  // seconds
  end: number    // seconds
  text: string
  avgLogprob?: number
}

export interface TranscriptResult {
  segments: TranscriptSegment[]
  language: string
  duration: number
  text: string
}

export async function transcribeAudio(
  audioBuffer: ArrayBuffer,
  filename: string,
  language?: string,
): Promise<TranscriptResult> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('GROQ_API_KEY not configured')

  const blob = new Blob([audioBuffer], { type: getMimeType(filename) })
  const form = new FormData()
  form.append('file', blob, filename)
  form.append('model', 'whisper-large-v3-turbo')
  form.append('response_format', 'verbose_json')
  form.append('timestamp_granularities[]', 'segment')
  if (language) form.append('language', language)

  const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
    signal: AbortSignal.timeout(120_000),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Groq Whisper ${res.status}: ${err.slice(0, 300)}`)
  }

  const data = (await res.json()) as {
    text: string
    language: string
    duration: number
    segments: Array<{
      id: number
      start: number
      end: number
      text: string
      avg_logprob?: number
    }>
  }

  return {
    text: data.text,
    language: data.language ?? 'en',
    duration: data.duration ?? 0,
    segments: (data.segments ?? []).map((s) => ({
      id: s.id,
      start: s.start,
      end: s.end,
      text: s.text.trim(),
      avgLogprob: s.avg_logprob,
    })),
  }
}

function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  const map: Record<string, string> = {
    mp3: 'audio/mpeg',
    mp4: 'video/mp4',
    m4a: 'audio/mp4',
    wav: 'audio/wav',
    webm: 'audio/webm',
    ogg: 'audio/ogg',
    flac: 'audio/flac',
  }
  return map[ext] ?? 'audio/mpeg'
}
