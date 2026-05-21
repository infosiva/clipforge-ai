import type { TranscriptSegment } from './transcribe'

export interface ScoredSegment {
  id: number
  start: number
  end: number
  text: string
  viralityScore: number   // 0-100
  hookLine: string        // one-line hook for the clip
  clipTitle: string       // short title for the clip card
  platform: 'tiktok' | 'youtube-shorts' | 'reels' | 'all'
}

interface CandidateSegment {
  start: number
  end: number
  text: string
  segmentIds: number[]
}

// Merge consecutive Whisper segments into 30-60s clip candidates
export function groupIntoCandidates(
  segments: TranscriptSegment[],
  targetDuration = 45,
): CandidateSegment[] {
  const candidates: CandidateSegment[] = []
  let current: CandidateSegment | null = null

  for (const seg of segments) {
    if (!current) {
      current = { start: seg.start, end: seg.end, text: seg.text, segmentIds: [seg.id] }
      continue
    }

    const duration = seg.end - current.start
    if (duration <= targetDuration) {
      current.end = seg.end
      current.text += ' ' + seg.text
      current.segmentIds.push(seg.id)
    } else {
      candidates.push(current)
      current = { start: seg.start, end: seg.end, text: seg.text, segmentIds: [seg.id] }
    }
  }

  if (current) candidates.push(current)
  return candidates
}

export async function scoreSegments(
  segments: TranscriptSegment[],
  context: { podcastTitle?: string; hostName?: string } = {},
): Promise<ScoredSegment[]> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('GROQ_API_KEY not configured')

  const candidates = groupIntoCandidates(segments)
  if (candidates.length === 0) return []

  const contextLine = context.podcastTitle
    ? `Podcast: "${context.podcastTitle}"${context.hostName ? ` hosted by ${context.hostName}` : ''}.`
    : ''

  const prompt = `${contextLine}
You are a viral content strategist. Analyze these podcast transcript segments and identify the TOP 5 most viral-worthy moments.

For each segment, evaluate:
- Surprising or counter-intuitive insights
- Strong opinions or controversial takes
- Emotional peaks (story, humor, anger, inspiration)
- Actionable tips with clear value
- Quotable one-liners

Segments (with timestamps in seconds):
${candidates
  .slice(0, 20)
  .map((c, i) => `[${i}] ${c.start.toFixed(1)}s-${c.end.toFixed(1)}s: "${c.text.slice(0, 300)}"`)
  .join('\n')}

Return a JSON array of exactly 5 objects. No other text, just the array:
[
  {
    "segmentIndex": 0,
    "viralityScore": 87,
    "hookLine": "The hook that makes people stop scrolling",
    "clipTitle": "Short title for clip card",
    "platform": "tiktok"
  }
]

platform must be one of: "tiktok", "youtube-shorts", "reels", "all"`

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      max_tokens: 800,
      response_format: { type: 'json_object' },
    }),
    signal: AbortSignal.timeout(30_000),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Groq score ${res.status}: ${err.slice(0, 300)}`)
  }

  const data = (await res.json()) as { choices: Array<{ message: { content: string } }> }
  const content = data.choices[0]?.message?.content ?? '[]'

  let parsed: Array<{
    segmentIndex: number
    viralityScore: number
    hookLine: string
    clipTitle: string
    platform: string
  }>

  try {
    const raw = JSON.parse(content)
    // Groq json_object wraps array — handle both formats
    parsed = Array.isArray(raw) ? raw : (raw.segments ?? raw.clips ?? raw.moments ?? Object.values(raw)[0] as typeof parsed)
  } catch {
    throw new Error('Groq returned invalid JSON for virality scoring')
  }

  return parsed
    .filter((item) => typeof item.segmentIndex === 'number' && item.segmentIndex < candidates.length)
    .slice(0, 5)
    .map((item, idx): ScoredSegment => {
      const candidate = candidates[item.segmentIndex]
      return {
        id: idx,
        start: candidate.start,
        end: candidate.end,
        text: candidate.text,
        viralityScore: Math.min(100, Math.max(0, Math.round(item.viralityScore))),
        hookLine: item.hookLine ?? '',
        clipTitle: item.clipTitle ?? `Clip ${idx + 1}`,
        platform: (['tiktok', 'youtube-shorts', 'reels', 'all'].includes(item.platform)
          ? item.platform
          : 'all') as ScoredSegment['platform'],
      }
    })
}
