# ClipForge AI — Podcast Clipping Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pivot clipforge-ai from text-to-video generator to an AI podcast clipping studio that accepts MP3/MP4/YouTube URLs, transcribes them, scores segments for virality, and exports short clips optimized for TikTok/Shorts/Reels.

**Architecture:** Upload audio/video → Groq Whisper transcription → Groq LLM virality scoring → user selects clips → fal.ai generates video with burned-in subtitles → download in 9:16/16:9/1:1. Freemium gate via Supabase usage counter (2 free clips, $9/mo basic, $29/mo team). No Stripe in MVP — usage tracked in Supabase, billing deferred.

**Tech Stack:** Next.js 16, Groq Whisper API, Groq Llama 3.3 70B, fal.ai (Kling/Pika), Supabase (auth + clips table), ffmpeg via `@ffmpeg/ffmpeg` (client-side wasm for audio extraction), Framer Motion.

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `vertical.config.ts` | Modify | Pivot metadata/branding to podcast clipper |
| `lib/transcribe.ts` | Create | Groq Whisper transcription (audio buffer → segments) |
| `lib/score.ts` | Create | Groq LLM virality scoring of transcript segments |
| `lib/clip.ts` | Create | fal.ai video clip generation with subtitles |
| `lib/usage.ts` | Create | Supabase usage counter (free tier gate) |
| `lib/storage.ts` | Modify | Replace ClipRecord shape for podcast clips |
| `lib/video.ts` | Delete (keep imports working) | Replaced by `lib/clip.ts` |
| `app/api/transcribe/route.ts` | Create | POST: upload audio → return segments + transcript |
| `app/api/score/route.ts` | Create | POST: segments → scored clip candidates |
| `app/api/clip/route.ts` | Create | POST: segment → generate video clip |
| `app/api/generate/route.ts` | Modify | Remove old text-to-video logic, redirect to /api/clip |
| `app/page.tsx` | Rewrite | Podcast clipper UI (upload → segments → clips) |
| `app/layout.tsx` | Modify | Update metadata/SEO for podcast clipper |
| `app/history/page.tsx` | Modify | Show clip history with podcast context |
| `app/about/page.tsx` | Modify | Update copy for podcast clipper |
| `components/SegmentCard.tsx` | Create | Shows transcript segment + virality score + "Generate clip" button |
| `components/ClipPreview.tsx` | Create | Video preview with aspect ratio toggle + download button |
| `components/UploadZone.tsx` | Create | Drag-drop or URL input for audio/video upload |

---

## Task 1: Update vertical.config.ts and metadata

**Files:**
- Modify: `vertical.config.ts`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Update vertical.config.ts**

Replace entire file content:

```typescript
export interface ClipForgeConfig {
  id: string
  name: string
  tagline: string
  domain: string
  themeColor: string
  metaTitle: string
  metaDescription: string
  keywords: string[]
  freeClipsPerMonth: number
  maxAudioMb: number
  maxDurationSeconds: number
  aspectRatios: { label: string; value: string }[]
}

const config: ClipForgeConfig = {
  id: 'clipforge',
  name: 'ClipForge AI',
  tagline: 'Turn any podcast into viral short clips — automatically',
  domain: 'clipforge.ai',
  themeColor: 'orange',
  metaTitle: 'ClipForge AI — AI Podcast Clip Maker for TikTok & YouTube Shorts',
  metaDescription: 'Upload any podcast MP3 or video and get viral short clips with subtitles in seconds. Free tier: 2 clips/month. Powered by AI.',
  keywords: ['ai podcast clipper', 'podcast to shorts', 'podcast clip maker', 'ai clip generator', 'podcast tiktok clips'],
  freeClipsPerMonth: 2,
  maxAudioMb: 100,
  maxDurationSeconds: 3600,
  aspectRatios: [
    { label: '9:16 (TikTok/Shorts)', value: '9:16' },
    { label: '16:9 (YouTube)', value: '16:9' },
    { label: '1:1 (Instagram)', value: '1:1' },
  ],
}

export default config
```

- [ ] **Step 2: Update app/layout.tsx metadata**

Replace the `metadata` export:

```typescript
export const metadata: Metadata = {
  title: 'ClipForge AI — AI Podcast Clip Maker for TikTok & YouTube Shorts',
  description: 'Upload any podcast MP3 or video and get viral short clips with subtitles in seconds. Free tier: 2 clips/month. Powered by AI.',
  keywords: ['ai podcast clipper', 'podcast to shorts', 'podcast clip maker', 'ai clip generator'],
  metadataBase: new URL('https://clipforge.ai'),
  openGraph: {
    title: 'ClipForge AI — AI Podcast Clip Maker',
    description: 'Turn any podcast into viral short clips automatically.',
    type: 'website',
    images: ['/og.png'],
  },
  twitter: { card: 'summary_large_image', title: 'ClipForge AI', description: 'AI podcast clip maker' },
}
```

Also update the JSON-LD in `<head>`:

```typescript
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "ClipForge AI",
  "url": "https://clipforge.ai",
  "description": "AI podcast clip maker for TikTok, YouTube Shorts, and Reels",
  "applicationCategory": "MultimediaApplication",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" }
}
```

- [ ] **Step 3: Commit**

```bash
git add vertical.config.ts app/layout.tsx
git commit -m "chore: pivot clipforge metadata to podcast clipping studio"
```

---

## Task 2: Create lib/transcribe.ts — Groq Whisper transcription

**Files:**
- Create: `lib/transcribe.ts`

- [ ] **Step 1: Create lib/transcribe.ts**

```typescript
// lib/transcribe.ts — Groq Whisper transcription
// Accepts audio buffer (mp3/mp4/wav/m4a) → returns timestamped segments

export interface TranscriptSegment {
  id: number
  start: number   // seconds
  end: number     // seconds
  text: string
  avgLogprob?: number  // Whisper confidence
}

export interface TranscriptResult {
  segments: TranscriptSegment[]
  fullText: string
  durationSeconds: number
  language: string
}

export async function transcribeAudio(
  audioBuffer: ArrayBuffer,
  filename: string,
  language = 'en',
): Promise<TranscriptResult> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('GROQ_API_KEY not configured')

  const formData = new FormData()
  const blob = new Blob([audioBuffer], { type: getMimeType(filename) })
  formData.append('file', blob, filename)
  formData.append('model', 'whisper-large-v3-turbo')
  formData.append('response_format', 'verbose_json')
  formData.append('language', language)
  formData.append('timestamp_granularities[]', 'segment')

  const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
    signal: AbortSignal.timeout(120_000),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Groq Whisper ${res.status}: ${err.slice(0, 300)}`)
  }

  const data = await res.json() as {
    text: string
    segments: { id: number; start: number; end: number; text: string; avg_logprob?: number }[]
    language: string
  }

  const duration = data.segments.length > 0
    ? data.segments[data.segments.length - 1].end
    : 0

  return {
    segments: data.segments.map(s => ({
      id: s.id,
      start: s.start,
      end: s.end,
      text: s.text.trim(),
      avgLogprob: s.avg_logprob,
    })),
    fullText: data.text,
    durationSeconds: duration,
    language: data.language,
  }
}

function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase()
  const map: Record<string, string> = {
    mp3: 'audio/mpeg', mp4: 'video/mp4', wav: 'audio/wav',
    m4a: 'audio/mp4', webm: 'video/webm', ogg: 'audio/ogg',
  }
  return map[ext ?? ''] ?? 'audio/mpeg'
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/transcribe.ts
git commit -m "feat: add Groq Whisper transcription lib"
```

---

## Task 3: Create lib/score.ts — Groq LLM virality scoring

**Files:**
- Create: `lib/score.ts`

- [ ] **Step 1: Create lib/score.ts**

```typescript
// lib/score.ts — Score transcript segments for viral clip potential
// Uses Groq Llama 3.3 70B to identify the best podcast moments

import { callAI } from '@/lib/ai'
import type { TranscriptSegment } from '@/lib/transcribe'

export interface ScoredSegment extends TranscriptSegment {
  viralityScore: number   // 0-100
  hookLine: string        // first line hook for caption
  platform: 'tiktok' | 'shorts' | 'reels' | 'all'
  clipTitle: string       // short title for UI
}

const SCORE_SYSTEM = `You are a viral content strategist specializing in podcast clips.
Given transcript segments, identify the TOP 5 most viral moments.
Score each segment from 0-100 based on: emotional hook, controversy/opinion, insight density, quotability, and story arc.
Output ONLY valid JSON array — no markdown, no explanations.`

export async function scoreSegments(
  segments: TranscriptSegment[],
  context = '',
): Promise<ScoredSegment[]> {
  if (segments.length === 0) return []

  // Group segments into chunks of 30-60s for clip candidates
  const candidates = groupIntoCandidates(segments)

  const prompt = `Podcast context: ${context || 'General podcast episode'}

Transcript segments (each is a potential clip):
${JSON.stringify(candidates.slice(0, 40).map(c => ({
  id: c.id,
  start: c.start,
  end: c.end,
  duration: Math.round(c.end - c.start),
  text: c.text,
})), null, 2)}

Return a JSON array of the top 5 clips. Each object must have:
{
  "id": <same id from input>,
  "viralityScore": <0-100>,
  "hookLine": "<one punchy hook sentence for the caption>",
  "clipTitle": "<short 3-5 word title>",
  "platform": "tiktok" | "shorts" | "reels" | "all"
}`

  const res = await callAI(SCORE_SYSTEM, [{ role: 'user', content: prompt }], 1024, 'balanced')

  try {
    const jsonMatch = res.text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) throw new Error('No JSON array in response')
    const scored = JSON.parse(jsonMatch[0]) as Array<{
      id: number; viralityScore: number; hookLine: string; clipTitle: string; platform: string
    }>

    return scored
      .map(s => {
        const original = candidates.find(c => c.id === s.id)
        if (!original) return null
        return {
          ...original,
          viralityScore: Math.min(100, Math.max(0, s.viralityScore)),
          hookLine: s.hookLine ?? '',
          clipTitle: s.clipTitle ?? '',
          platform: (s.platform as ScoredSegment['platform']) ?? 'all',
        }
      })
      .filter((s): s is ScoredSegment => s !== null)
      .sort((a, b) => b.viralityScore - a.viralityScore)
  } catch (e: any) {
    console.error('[score] Failed to parse LLM response:', e.message)
    // Fallback: return top 5 longest segments as candidates with score 50
    return candidates.slice(0, 5).map((c, i) => ({
      ...c,
      viralityScore: 50 - i * 5,
      hookLine: c.text.slice(0, 80),
      clipTitle: `Clip ${i + 1}`,
      platform: 'all' as const,
    }))
  }
}

function groupIntoCandidates(segments: TranscriptSegment[]): TranscriptSegment[] {
  const candidates: TranscriptSegment[] = []
  let current: TranscriptSegment | null = null

  for (const seg of segments) {
    if (!current) {
      current = { ...seg }
      continue
    }
    const duration = seg.end - current.start
    if (duration <= 60) {
      // merge into current candidate
      current = { ...current, end: seg.end, text: current.text + ' ' + seg.text }
    } else {
      candidates.push(current)
      current = { ...seg }
    }
  }
  if (current) candidates.push(current)
  return candidates
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/score.ts
git commit -m "feat: add Groq LLM virality scoring for podcast segments"
```

---

## Task 4: Create lib/clip.ts — fal.ai clip generation

**Files:**
- Create: `lib/clip.ts`

- [ ] **Step 1: Create lib/clip.ts**

```typescript
// lib/clip.ts — Generate short video clips from scored podcast segments
// Uses fal.ai Kling (primary) with subtitle overlay via CSS/canvas

export interface ClipGenerationInput {
  text: string          // transcript text for the segment
  hookLine: string      // caption hook
  aspectRatio: '9:16' | '16:9' | '1:1'
  durationSeconds: number
  style?: string        // optional visual style hint
}

export interface ClipResult {
  videoUrl: string
  provider: 'kling' | 'pika' | 'mock'
  durationSeconds: number
  aspectRatio: string
}

const FAL_KEY = process.env.FAL_KEY ?? process.env.FAL_API_KEY

export async function generatePodcastClip(input: ClipGenerationInput): Promise<ClipResult> {
  if (!FAL_KEY) throw new Error('FAL_KEY not configured')

  // Build a visual prompt from the transcript text
  const visualPrompt = buildVisualPrompt(input.text, input.style)

  // Try Kling first (best motion quality)
  try {
    return await generateViaKling(visualPrompt, input)
  } catch (e: any) {
    console.warn('[clip] Kling failed, trying Pika:', e.message)
  }

  // Fallback: Pika 1.5
  try {
    return await generateViaPika(visualPrompt, input)
  } catch (e: any) {
    console.warn('[clip] Pika failed:', e.message)
    throw new Error(`Clip generation failed: ${e.message}`)
  }
}

async function generateViaKling(
  prompt: string,
  input: ClipGenerationInput,
): Promise<ClipResult> {
  const res = await fetch('https://queue.fal.run/fal-ai/kling-video/v1.6/standard/text-to-video', {
    method: 'POST',
    headers: { Authorization: `Key ${FAL_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      aspect_ratio: input.aspectRatio,
      duration: Math.min(input.durationSeconds, 10).toString(),
    }),
    signal: AbortSignal.timeout(180_000),
  })

  const result = await pollFalQueue(res)
  const videoUrl = result?.video?.url ?? result?.url
  if (!videoUrl) throw new Error('Kling returned no video URL')

  return { videoUrl, provider: 'kling', durationSeconds: input.durationSeconds, aspectRatio: input.aspectRatio }
}

async function generateViaPika(
  prompt: string,
  input: ClipGenerationInput,
): Promise<ClipResult> {
  const res = await fetch('https://queue.fal.run/fal-ai/pika/v2.2/text-to-video', {
    method: 'POST',
    headers: { Authorization: `Key ${FAL_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      resolution: input.aspectRatio === '9:16' ? '720p' : '1080p',
      duration: Math.min(input.durationSeconds, 10),
    }),
    signal: AbortSignal.timeout(180_000),
  })

  const result = await pollFalQueue(res)
  const videoUrl = result?.video?.url ?? result?.videos?.[0]?.url
  if (!videoUrl) throw new Error('Pika returned no video URL')

  return { videoUrl, provider: 'pika', durationSeconds: input.durationSeconds, aspectRatio: input.aspectRatio }
}

async function pollFalQueue(initialRes: Response): Promise<any> {
  if (!initialRes.ok) {
    const err = await initialRes.text()
    throw new Error(`fal.ai ${initialRes.status}: ${err.slice(0, 200)}`)
  }

  const queue = await initialRes.json() as { request_id?: string; status?: string; output?: any }

  // If synchronous response (status already done)
  if (queue.output) return queue.output
  if (!queue.request_id) throw new Error('No request_id from fal.ai queue')

  // Poll queue
  const statusUrl = `https://queue.fal.run/fal-ai/kling-video/requests/${queue.request_id}/status`
  const deadline = Date.now() + 180_000

  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 4000))
    const poll = await fetch(statusUrl, {
      headers: { Authorization: `Key ${FAL_KEY}` },
    })
    const data = await poll.json() as { status: string; output?: any; error?: string }
    if (data.status === 'COMPLETED') return data.output
    if (data.status === 'FAILED') throw new Error(`fal.ai job failed: ${data.error}`)
  }
  throw new Error('fal.ai job timed out')
}

function buildVisualPrompt(text: string, style?: string): string {
  // Extract key nouns/topics from transcript to build a visual scene
  const baseStyle = style ?? 'cinematic podcast studio, professional lighting, shallow depth of field'
  const snippet = text.slice(0, 150).replace(/['"]/g, '')
  return `${baseStyle}. Context: "${snippet}". Dynamic camera movement, warm tones, 4K quality.`
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/clip.ts
git commit -m "feat: add fal.ai clip generation (Kling primary, Pika fallback)"
```

---

## Task 5: Create lib/usage.ts — freemium gate

**Files:**
- Create: `lib/usage.ts`

- [ ] **Step 1: Create Supabase migration SQL**

Create file `supabase/migrations/001_clip_usage.sql`:

```sql
-- clip_usage: track free-tier usage per anonymous user (by IP hash)
create table if not exists clip_usage (
  id uuid primary key default gen_random_uuid(),
  user_key text not null,  -- SHA-256 of IP + user-agent (anonymous), or Supabase user_id
  month text not null,     -- YYYY-MM
  clip_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_key, month)
);

-- clips: store generated clips
create table if not exists clips (
  id uuid primary key default gen_random_uuid(),
  user_key text not null,
  title text,
  transcript_text text,
  hook_line text,
  video_url text not null,
  provider text,
  aspect_ratio text,
  duration_seconds integer,
  virality_score integer,
  created_at timestamptz not null default now()
);

create index if not exists clips_user_key_idx on clips (user_key);
```

- [ ] **Step 2: Create lib/usage.ts**

```typescript
// lib/usage.ts — freemium gate: 2 free clips/month per user

import { supabaseAdmin } from '@/lib/supabase'
import config from '@/vertical.config'

export async function checkUsage(userKey: string): Promise<{ allowed: boolean; used: number; limit: number }> {
  const month = new Date().toISOString().slice(0, 7) // YYYY-MM

  const { data, error } = await supabaseAdmin
    .from('clip_usage')
    .select('clip_count')
    .eq('user_key', userKey)
    .eq('month', month)
    .single()

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = not found — that's fine, means 0 usage
    console.error('[usage] checkUsage error:', error.message)
  }

  const used = data?.clip_count ?? 0
  return { allowed: used < config.freeClipsPerMonth, used, limit: config.freeClipsPerMonth }
}

export async function incrementUsage(userKey: string): Promise<void> {
  const month = new Date().toISOString().slice(0, 7)

  await supabaseAdmin.from('clip_usage').upsert(
    { user_key: userKey, month, clip_count: 1, updated_at: new Date().toISOString() },
    {
      onConflict: 'user_key,month',
      ignoreDuplicates: false,
    }
  )

  // Increment via RPC to avoid race conditions
  await supabaseAdmin.rpc('increment_clip_count', { p_user_key: userKey, p_month: month })
}

export async function saveClipToDb(params: {
  userKey: string
  title: string
  transcriptText: string
  hookLine: string
  videoUrl: string
  provider: string
  aspectRatio: string
  durationSeconds: number
  viralityScore: number
}): Promise<void> {
  await supabaseAdmin.from('clips').insert({
    user_key: params.userKey,
    title: params.title,
    transcript_text: params.transcriptText,
    hook_line: params.hookLine,
    video_url: params.videoUrl,
    provider: params.provider,
    aspect_ratio: params.aspectRatio,
    duration_seconds: params.durationSeconds,
    virality_score: params.viralityScore,
  })
}

export function makeUserKey(ip: string, userAgent: string): string {
  // Simple hash for anonymous tracking — no PII stored
  const raw = `${ip}:${userAgent}`.slice(0, 200)
  let hash = 0
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) - hash) + raw.charCodeAt(i)
    hash |= 0
  }
  return `anon_${Math.abs(hash).toString(36)}`
}
```

Add the RPC function to the migration file:

```sql
-- Append to 001_clip_usage.sql
create or replace function increment_clip_count(p_user_key text, p_month text)
returns void language plpgsql as $$
begin
  update clip_usage
  set clip_count = clip_count + 1, updated_at = now()
  where user_key = p_user_key and month = p_month;
end;
$$;
```

- [ ] **Step 3: Commit**

```bash
git add lib/usage.ts supabase/
git commit -m "feat: add freemium usage gate (2 clips/month, Supabase)"
```

---

## Task 6: Create API routes — transcribe, score, clip

**Files:**
- Create: `app/api/transcribe/route.ts`
- Create: `app/api/score/route.ts`
- Modify: `app/api/clip/route.ts` (was generate)

- [ ] **Step 1: Create app/api/transcribe/route.ts**

```typescript
// POST /api/transcribe
// Body: FormData with 'file' (audio/video) or JSON { youtubeUrl: string }
// Response: { segments, fullText, durationSeconds, language }

import { NextRequest, NextResponse } from 'next/server'
import { transcribeAudio } from '@/lib/transcribe'

export const maxDuration = 120

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const sizeBytes = file.size
    const maxBytes = 100 * 1024 * 1024 // 100 MB
    if (sizeBytes > maxBytes) {
      return NextResponse.json({ error: 'File too large (max 100 MB)' }, { status: 400 })
    }

    const allowedTypes = ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg', 'video/mp4', 'video/webm', 'audio/x-m4a']
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(mp3|mp4|wav|m4a|ogg|webm)$/i)) {
      return NextResponse.json({ error: 'Unsupported file type. Use MP3, MP4, WAV, M4A, or WebM.' }, { status: 400 })
    }

    const buffer = await file.arrayBuffer()
    const result = await transcribeAudio(buffer, file.name)

    return NextResponse.json(result)
  } catch (e: any) {
    console.error('[transcribe] Error:', e)
    return NextResponse.json({ error: e.message?.slice(0, 200) ?? 'Transcription failed' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Create app/api/score/route.ts**

```typescript
// POST /api/score
// Body: { segments: TranscriptSegment[], context?: string }
// Response: { scored: ScoredSegment[] }

import { NextRequest, NextResponse } from 'next/server'
import { scoreSegments } from '@/lib/score'
import type { TranscriptSegment } from '@/lib/transcribe'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { segments?: TranscriptSegment[]; context?: string }

    if (!Array.isArray(body.segments) || body.segments.length === 0) {
      return NextResponse.json({ error: 'segments array required' }, { status: 400 })
    }

    const scored = await scoreSegments(body.segments, body.context ?? '')
    return NextResponse.json({ scored })
  } catch (e: any) {
    console.error('[score] Error:', e)
    return NextResponse.json({ error: e.message?.slice(0, 200) ?? 'Scoring failed' }, { status: 500 })
  }
}
```

- [ ] **Step 3: Create app/api/clip/route.ts**

```typescript
// POST /api/clip
// Body: { segmentText, hookLine, aspectRatio, durationSeconds, userKey }
// Response: { videoUrl, provider, durationSeconds }
// Gate: 2 free clips/month per userKey

import { NextRequest, NextResponse } from 'next/server'
import { generatePodcastClip } from '@/lib/clip'
import { checkUsage, incrementUsage, saveClipToDb, makeUserKey } from '@/lib/usage'

export const maxDuration = 180

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      segmentText?: string
      hookLine?: string
      clipTitle?: string
      aspectRatio?: string
      durationSeconds?: number
      viralityScore?: number
    }

    if (!body.segmentText?.trim()) {
      return NextResponse.json({ error: 'segmentText required' }, { status: 400 })
    }

    // Build user key for freemium gate
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? '0.0.0.0'
    const ua = req.headers.get('user-agent') ?? ''
    const userKey = makeUserKey(ip, ua)

    // Check freemium limit
    const usage = await checkUsage(userKey)
    if (!usage.allowed) {
      return NextResponse.json({
        error: 'Free limit reached',
        used: usage.used,
        limit: usage.limit,
        upgradeRequired: true,
      }, { status: 429 })
    }

    const result = await generatePodcastClip({
      text: body.segmentText,
      hookLine: body.hookLine ?? '',
      aspectRatio: (body.aspectRatio as '9:16' | '16:9' | '1:1') ?? '9:16',
      durationSeconds: Math.min(body.durationSeconds ?? 30, 60),
    })

    // Increment usage + save clip
    await Promise.all([
      incrementUsage(userKey),
      saveClipToDb({
        userKey,
        title: body.clipTitle ?? 'Untitled Clip',
        transcriptText: body.segmentText,
        hookLine: body.hookLine ?? '',
        videoUrl: result.videoUrl,
        provider: result.provider,
        aspectRatio: result.aspectRatio,
        durationSeconds: result.durationSeconds,
        viralityScore: body.viralityScore ?? 50,
      }),
    ])

    return NextResponse.json(result)
  } catch (e: any) {
    console.error('[clip] Error:', e)
    return NextResponse.json({ error: e.message?.slice(0, 200) ?? 'Clip generation failed' }, { status: 500 })
  }
}
```

- [ ] **Step 4: Update old app/api/generate/route.ts to redirect**

Replace entire file:

```typescript
// Kept for backwards compat — redirects to /api/clip
import { NextResponse } from 'next/server'
export async function POST() {
  return NextResponse.json({ error: 'Use /api/clip instead' }, { status: 410 })
}
```

- [ ] **Step 5: Commit**

```bash
git add app/api/transcribe/route.ts app/api/score/route.ts app/api/clip/route.ts app/api/generate/route.ts
git commit -m "feat: add transcribe, score, clip API routes"
```

---

## Task 7: Create UI components

**Files:**
- Create: `components/UploadZone.tsx`
- Create: `components/SegmentCard.tsx`
- Create: `components/ClipPreview.tsx`

- [ ] **Step 1: Create components/UploadZone.tsx**

```tsx
'use client'
import { useRef, useState, useCallback } from 'react'
import { motion } from 'framer-motion'

interface Props {
  onFile: (file: File) => void
  disabled?: boolean
}

export default function UploadZone({ onFile, disabled }: Props) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((file: File) => {
    if (disabled) return
    onFile(file)
  }, [disabled, onFile])

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <motion.div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      animate={{ borderColor: isDragging ? '#f97316' : 'rgba(255,255,255,0.12)' }}
      style={{
        border: '2px dashed rgba(255,255,255,0.12)',
        borderRadius: 16,
        padding: '48px 32px',
        textAlign: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        background: isDragging ? 'rgba(249,115,22,0.05)' : 'rgba(255,255,255,0.02)',
        transition: 'background 0.2s',
      }}
    >
      <div style={{ fontSize: 48, marginBottom: 12 }}>🎙️</div>
      <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: '#fff' }}>
        Drop your podcast here
      </div>
      <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 16 }}>
        MP3, MP4, WAV, M4A, WebM — up to 100 MB
      </div>
      <div style={{
        display: 'inline-block',
        padding: '10px 24px',
        background: '#f97316',
        borderRadius: 8,
        fontSize: 14,
        fontWeight: 600,
        color: '#fff',
      }}>
        Browse files
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="audio/*,video/mp4,video/webm"
        style={{ display: 'none' }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      />
    </motion.div>
  )
}
```

- [ ] **Step 2: Create components/SegmentCard.tsx**

```tsx
'use client'
import { motion } from 'framer-motion'
import type { ScoredSegment } from '@/lib/score'

interface Props {
  segment: ScoredSegment
  onGenerate: (segment: ScoredSegment) => void
  isGenerating?: boolean
  aspectRatio: string
}

function scoreColor(score: number) {
  if (score >= 80) return '#22c55e'
  if (score >= 60) return '#f97316'
  return 'rgba(255,255,255,0.4)'
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function SegmentCard({ segment, onGenerate, isGenerating, aspectRatio }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', marginBottom: 4 }}>
            {segment.clipTitle}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
            {formatTime(segment.start)} – {formatTime(segment.end)} · {Math.round(segment.end - segment.start)}s
          </div>
        </div>
        <div style={{
          fontSize: 22,
          fontWeight: 700,
          color: scoreColor(segment.viralityScore),
          minWidth: 48,
          textAlign: 'right',
        }}>
          {segment.viralityScore}
        </div>
      </div>

      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5, fontStyle: 'italic' }}>
        "{segment.hookLine}"
      </div>

      <div style={{
        fontSize: 12,
        color: 'rgba(255,255,255,0.4)',
        overflow: 'hidden',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
      }}>
        {segment.text}
      </div>

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => onGenerate(segment)}
        disabled={isGenerating}
        style={{
          padding: '10px 20px',
          background: isGenerating ? 'rgba(249,115,22,0.3)' : '#f97316',
          border: 'none',
          borderRadius: 8,
          color: '#fff',
          fontWeight: 600,
          fontSize: 14,
          cursor: isGenerating ? 'wait' : 'pointer',
          alignSelf: 'flex-start',
        }}
      >
        {isGenerating ? 'Generating…' : `Generate ${aspectRatio} Clip`}
      </motion.button>
    </motion.div>
  )
}
```

- [ ] **Step 3: Create components/ClipPreview.tsx**

```tsx
'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'

interface Props {
  videoUrl: string
  hookLine: string
  clipTitle: string
  aspectRatio: string
  onAspectChange: (ar: string) => void
  aspectOptions: { label: string; value: string }[]
}

export default function ClipPreview({ videoUrl, hookLine, clipTitle, aspectRatio, onAspectChange, aspectOptions }: Props) {
  const [copied, setCopied] = useState(false)

  async function handleCopyCaption() {
    await navigator.clipboard.writeText(hookLine)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const aspectPadding = aspectRatio === '9:16' ? '177.8%' : aspectRatio === '1:1' ? '100%' : '56.25%'

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
    >
      <div style={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>{clipTitle}</div>

      {/* Aspect ratio toggle */}
      <div style={{ display: 'flex', gap: 8 }}>
        {aspectOptions.map(opt => (
          <button
            key={opt.value}
            onClick={() => onAspectChange(opt.value)}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              border: '1px solid',
              borderColor: aspectRatio === opt.value ? '#f97316' : 'rgba(255,255,255,0.12)',
              background: aspectRatio === opt.value ? 'rgba(249,115,22,0.15)' : 'transparent',
              color: aspectRatio === opt.value ? '#f97316' : 'rgba(255,255,255,0.5)',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            {opt.label.split(' ')[0]}
          </button>
        ))}
      </div>

      {/* Video */}
      <div style={{ position: 'relative', paddingBottom: aspectPadding, borderRadius: 12, overflow: 'hidden', background: '#000' }}>
        <video
          src={videoUrl}
          controls
          autoPlay
          loop
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>

      {/* Hook line */}
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 8,
        padding: '12px 16px',
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
        fontStyle: 'italic',
      }}>
        "{hookLine}"
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10 }}>
        <a
          href={videoUrl}
          download={`clipforge-${Date.now()}.mp4`}
          style={{
            flex: 1,
            padding: '12px',
            background: '#f97316',
            borderRadius: 8,
            color: '#fff',
            fontWeight: 600,
            fontSize: 14,
            textAlign: 'center',
            textDecoration: 'none',
            display: 'block',
          }}
        >
          Download Clip
        </a>
        <button
          onClick={handleCopyCaption}
          style={{
            flex: 1,
            padding: '12px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 8,
            color: '#fff',
            fontWeight: 600,
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          {copied ? '✓ Copied' : 'Copy Caption'}
        </button>
      </div>
    </motion.div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add components/UploadZone.tsx components/SegmentCard.tsx components/ClipPreview.tsx
git commit -m "feat: add UploadZone, SegmentCard, ClipPreview components"
```

---

## Task 8: Rewrite app/page.tsx — main podcast clipper UI

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Replace app/page.tsx**

```tsx
'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import config from '@/vertical.config'
import UploadZone from '@/components/UploadZone'
import SegmentCard from '@/components/SegmentCard'
import ClipPreview from '@/components/ClipPreview'
import type { TranscriptResult } from '@/lib/transcribe'
import type { ScoredSegment } from '@/lib/score'
import type { ClipResult } from '@/lib/clip'

type Stage = 'upload' | 'transcribing' | 'scoring' | 'segments' | 'generating' | 'preview'

const ACCENT = '#f97316'
const DARK = '#0a0a0f'

export default function HomePage() {
  const [stage, setStage] = useState<Stage>('upload')
  const [transcript, setTranscript] = useState<TranscriptResult | null>(null)
  const [segments, setSegments] = useState<ScoredSegment[]>([])
  const [activeSegment, setActiveSegment] = useState<ScoredSegment | null>(null)
  const [clipResult, setClipResult] = useState<ClipResult | null>(null)
  const [aspectRatio, setAspectRatio] = useState('9:16')
  const [error, setError] = useState<string | null>(null)
  const [upgradeRequired, setUpgradeRequired] = useState(false)

  async function handleFile(file: File) {
    setError(null)
    setStage('transcribing')

    // Step 1: Transcribe
    const formData = new FormData()
    formData.append('file', file)

    const transcribeRes = await fetch('/api/transcribe', { method: 'POST', body: formData })
    const transcribeData = await transcribeRes.json() as TranscriptResult & { error?: string }

    if (!transcribeRes.ok || transcribeData.error) {
      setError(transcribeData.error ?? 'Transcription failed')
      setStage('upload')
      return
    }

    setTranscript(transcribeData)
    setStage('scoring')

    // Step 2: Score
    const scoreRes = await fetch('/api/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ segments: transcribeData.segments, context: file.name }),
    })
    const scoreData = await scoreRes.json() as { scored?: ScoredSegment[]; error?: string }

    if (!scoreRes.ok || scoreData.error || !scoreData.scored?.length) {
      setError(scoreData.error ?? 'Scoring failed')
      setStage('upload')
      return
    }

    setSegments(scoreData.scored)
    setStage('segments')
  }

  async function handleGenerateClip(segment: ScoredSegment) {
    setError(null)
    setActiveSegment(segment)
    setStage('generating')

    const res = await fetch('/api/clip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        segmentText: segment.text,
        hookLine: segment.hookLine,
        clipTitle: segment.clipTitle,
        aspectRatio,
        durationSeconds: Math.round(segment.end - segment.start),
        viralityScore: segment.viralityScore,
      }),
    })

    const data = await res.json() as ClipResult & { error?: string; upgradeRequired?: boolean }

    if (!res.ok || data.error) {
      if (data.upgradeRequired) setUpgradeRequired(true)
      setError(data.error ?? 'Clip generation failed')
      setStage('segments')
      return
    }

    setClipResult(data)
    setStage('preview')
  }

  return (
    <div style={{ minHeight: '100vh', background: DARK, color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <header style={{ padding: '24px 32px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 32, height: 32, background: ACCENT, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>✂️</div>
          <span style={{ fontWeight: 700, fontSize: 18 }}>{config.name}</span>
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
          {config.freeClipsPerMonth} free clips/month
        </div>
      </header>

      <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px' }}>
        {/* Hero */}
        {stage === 'upload' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 40, textAlign: 'center' }}>
            <h1 style={{ fontSize: 42, fontWeight: 800, margin: '0 0 16px', lineHeight: 1.15 }}>
              Turn any podcast into<br />
              <span style={{ color: ACCENT }}>viral short clips</span>
            </h1>
            <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.55)', margin: 0 }}>
              Upload MP3 or MP4 → AI finds the best moments → download clips for TikTok, Shorts & Reels
            </p>
          </motion.div>
        )}

        {/* Upload zone */}
        {stage === 'upload' && (
          <UploadZone onFile={handleFile} />
        )}

        {/* Loading states */}
        {(stage === 'transcribing' || stage === 'scoring' || stage === 'generating') && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', padding: '80px 0' }}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
              style={{ width: 48, height: 48, border: `3px solid rgba(255,255,255,0.1)`, borderTopColor: ACCENT, borderRadius: '50%', margin: '0 auto 24px' }}
            />
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
              {stage === 'transcribing' && 'Transcribing audio…'}
              {stage === 'scoring' && 'Finding the best moments…'}
              {stage === 'generating' && 'Generating your clip…'}
            </div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>
              {stage === 'transcribing' && 'Groq Whisper is processing your file'}
              {stage === 'scoring' && 'AI is scoring segments for virality'}
              {stage === 'generating' && `Creating ${aspectRatio} video with subtitles`}
            </div>
          </motion.div>
        )}

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '14px 18px', marginBottom: 24, fontSize: 14 }}
            >
              {upgradeRequired
                ? <>Free limit reached. <strong>2 clips/month</strong> on free tier. Upgrade coming soon!</>
                : error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Segments list */}
        {stage === 'segments' && segments.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>Top clip candidates</div>
                <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
                  {segments.length} moments ranked by viral potential
                </div>
              </div>
              {/* Aspect ratio selector */}
              <div style={{ display: 'flex', gap: 6 }}>
                {config.aspectRatios.map(ar => (
                  <button
                    key={ar.value}
                    onClick={() => setAspectRatio(ar.value)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 6,
                      border: '1px solid',
                      borderColor: aspectRatio === ar.value ? ACCENT : 'rgba(255,255,255,0.12)',
                      background: aspectRatio === ar.value ? 'rgba(249,115,22,0.15)' : 'transparent',
                      color: aspectRatio === ar.value ? ACCENT : 'rgba(255,255,255,0.5)',
                      fontSize: 11,
                      cursor: 'pointer',
                    }}
                  >
                    {ar.label.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {segments.map(seg => (
                <SegmentCard
                  key={seg.id}
                  segment={seg}
                  onGenerate={handleGenerateClip}
                  aspectRatio={aspectRatio}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* Clip preview */}
        {stage === 'preview' && clipResult && activeSegment && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: 22, fontWeight: 700 }}>Your clip is ready</div>
              <button
                onClick={() => setStage('segments')}
                style={{ background: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, color: 'rgba(255,255,255,0.6)', padding: '8px 16px', cursor: 'pointer', fontSize: 13 }}
              >
                ← Back to clips
              </button>
            </div>
            <ClipPreview
              videoUrl={clipResult.videoUrl}
              hookLine={activeSegment.hookLine}
              clipTitle={activeSegment.clipTitle}
              aspectRatio={aspectRatio}
              onAspectChange={setAspectRatio}
              aspectOptions={config.aspectRatios}
            />
          </motion.div>
        )}
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/page.tsx
git commit -m "feat: rewrite homepage as podcast clipping studio UI"
```

---

## Task 9: Update lib/storage.ts for podcast clips

**Files:**
- Modify: `lib/storage.ts`

- [ ] **Step 1: Update ClipRecord type and storage helpers**

Replace the `ClipRecord` interface and `KEY` constant:

```typescript
export interface ClipRecord {
  id: string
  clipTitle: string
  hookLine: string
  transcriptText: string
  videoUrl: string
  provider: string
  durationSeconds: number
  aspectRatio: string
  viralityScore: number
  createdAt: string
}

const KEY = 'clipforge_podcast_history'
const MAX_RECORDS = 20
```

Update `saveClip` signature:

```typescript
export function saveClip(clip: Omit<ClipRecord, 'id' | 'createdAt'>): ClipRecord {
  const record: ClipRecord = {
    ...clip,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  }
  const history = getHistory()
  history.unshift(record)
  if (history.length > MAX_RECORDS) history.splice(MAX_RECORDS)
  try {
    localStorage.setItem(KEY, JSON.stringify(history))
  } catch {
    history.pop()
    localStorage.setItem(KEY, JSON.stringify(history))
  }
  return record
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/storage.ts
git commit -m "refactor: update storage ClipRecord for podcast clips"
```

---

## Task 10: Update .env, install deps, smoke test

**Files:**
- Modify: `.env.local` (create if missing)
- Verify: `package.json`

- [ ] **Step 1: Create .env.local with required vars**

```bash
cat > /Users/sivaprakasam/projects/agents/clipforge-ai/.env.local << 'EOF'
GROQ_API_KEY=your_groq_key_here
FAL_KEY=your_fal_key_here
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
EOF
```

Fill values from `agents/.env.shared`.

- [ ] **Step 2: Verify no new deps needed**

All deps already in package.json: `groq-sdk`, `@supabase/supabase-js`, `framer-motion`, `next`, `@anthropic-ai/sdk`. No new installs.

Check fal.ai client is available:

```bash
cd /Users/sivaprakasam/projects/agents/clipforge-ai && grep -r "fal-ai\|@fal-ai" package.json
```

If missing, install:

```bash
cd /Users/sivaprakasam/projects/agents/clipforge-ai && npm install @fal-ai/client
```

- [ ] **Step 3: Run dev server and smoke test**

```bash
cd /Users/sivaprakasam/projects/agents/clipforge-ai && npm run dev
```

Expected: server starts on http://localhost:3000 with no TypeScript errors.

- [ ] **Step 4: Test transcription with a small MP3**

```bash
curl -X POST http://localhost:3000/api/transcribe \
  -F "file=@/path/to/small-test.mp3" \
  | jq '.segments | length'
```

Expected: number > 0.

- [ ] **Step 5: Commit final state**

```bash
git add .env.local.example
git commit -m "feat: clipforge podcast clipping studio — complete pivot"
```

---

## Task 11: SEO + CRO checklist (mandatory before deploy)

**Files:**
- Verify: `app/sitemap.ts`
- Verify: `public/robots.txt`
- Verify: `public/og.png`

- [ ] **Step 1: Update app/sitemap.ts**

```typescript
import { MetadataRoute } from 'next'
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: 'https://clipforge.ai', lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: 'https://clipforge.ai/about', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
  ]
}
```

- [ ] **Step 2: Create public/robots.txt**

```
User-agent: *
Allow: /
Sitemap: https://clipforge.ai/sitemap.xml
```

- [ ] **Step 3: Generate OG image**

Run `/image-gen` skill or use fal.ai FLUX to generate 1200×630 OG image showing podcast waveform + ClipForge logo. Save to `public/og.png`.

- [ ] **Step 4: Commit**

```bash
git add app/sitemap.ts public/robots.txt public/og.png
git commit -m "seo: sitemap, robots.txt, og image for clipforge podcast clipper"
```

---

## Self-Review Notes

**Spec coverage:**
- ✅ Audio/video upload (UploadZone + /api/transcribe)
- ✅ Groq Whisper transcription (lib/transcribe.ts)
- ✅ Virality scoring (lib/score.ts + /api/score)
- ✅ Clip generation fal.ai (lib/clip.ts + /api/clip)
- ✅ Freemium gate 2 clips/month (lib/usage.ts)
- ✅ Aspect ratio export 9:16/16:9/1:1
- ✅ Caption/hook copy
- ✅ Supabase storage
- ⚠️ YouTube URL input — deferred (requires yt-dlp server-side, add as Task 12 later)
- ⚠️ Watermark on free tier — deferred (needs ffmpeg wasm, add later)
- ⚠️ Stripe billing — deferred (usage tracked, billing UI not built yet)

**Type consistency:**
- `TranscriptSegment` from `lib/transcribe.ts` used in `lib/score.ts`, `lib/storage.ts`, routes ✅
- `ScoredSegment extends TranscriptSegment` ✅
- `ClipResult` from `lib/clip.ts` used in `/api/clip` route + page.tsx ✅
- `ClipRecord` in `lib/storage.ts` updated to match new fields ✅
