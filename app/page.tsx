'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import config from '@/vertical.config'
import { saveClip } from '@/lib/storage'
import type { ScoredSegment } from '@/lib/score'
import UploadZone from '@/components/UploadZone'
import SegmentCard from '@/components/SegmentCard'
import ClipPreview from '@/components/ClipPreview'

type Stage =
  | 'upload'
  | 'transcribing'
  | 'scoring'
  | 'segments'
  | 'generating'
  | 'preview'

interface ClipResult {
  url: string
  provider: string
  aspectRatio: string
  durationSeconds: number
  hookLine: string
  clipTitle: string
  remaining: number
}

export default function HomePage() {
  const [stage, setStage] = useState<Stage>('upload')
  const [segments, setSegments] = useState<ScoredSegment[]>([])
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9' | '1:1'>('9:16')
  const [generatingId, setGeneratingId] = useState<number | null>(null)
  const [clipResult, setClipResult] = useState<ClipResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [remaining, setRemaining] = useState<number | null>(null)

  const reset = useCallback(() => {
    setStage('upload')
    setSegments([])
    setClipResult(null)
    setError(null)
    setGeneratingId(null)
  }, [])

  const handleFile = useCallback(async (file: File) => {
    setError(null)
    setStage('transcribing')

    try {
      // Transcribe
      const form = new FormData()
      form.append('file', file)
      const transcribeRes = await fetch('/api/transcribe', { method: 'POST', body: form })
      const transcribeData = await transcribeRes.json() as { segments?: unknown[]; error?: string }

      if (!transcribeRes.ok || transcribeData.error) {
        setError(transcribeData.error ?? 'Transcription failed')
        setStage('upload')
        return
      }

      // Score
      setStage('scoring')
      const scoreRes = await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segments: transcribeData.segments }),
      })
      const scoreData = await scoreRes.json() as { segments?: ScoredSegment[]; error?: string }

      if (!scoreRes.ok || scoreData.error) {
        setError(scoreData.error ?? 'Scoring failed')
        setStage('upload')
        return
      }

      setSegments(scoreData.segments ?? [])
      setStage('segments')
    } catch (e) {
      setError((e as Error).message ?? 'Network error')
      setStage('upload')
    }
  }, [])

  const handleGenerate = useCallback(async (segment: ScoredSegment) => {
    setGeneratingId(segment.id)
    setStage('generating')
    setError(null)

    try {
      const res = await fetch('/api/clip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segment, aspectRatio }),
      })
      const data = await res.json() as ClipResult & { error?: string; upgradeRequired?: boolean }

      if (!res.ok || data.error) {
        if (data.upgradeRequired) {
          setError('Free clip limit reached. Upgrade to continue.')
        } else {
          setError(data.error ?? 'Clip generation failed')
        }
        setStage('segments')
        setGeneratingId(null)
        return
      }

      setClipResult(data)
      setRemaining(data.remaining)
      setStage('preview')

      // Save to local history
      saveClip({
        clipTitle: data.clipTitle,
        hookLine: data.hookLine,
        videoUrl: data.url,
        provider: data.provider,
        durationSeconds: data.durationSeconds,
        aspectRatio: data.aspectRatio,
        viralityScore: segment.viralityScore,
        transcriptText: segment.text,
      })
    } catch (e) {
      setError((e as Error).message ?? 'Network error')
      setStage('segments')
      setGeneratingId(null)
    }
  }, [aspectRatio])

  const handleAspectRatioChange = useCallback((ar: '9:16' | '16:9' | '1:1') => {
    setAspectRatio(ar)
  }, [])

  return (
    <div className="min-h-screen" style={{ background: '#0a0a0f', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      {/* Animated blob bg */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div
          className="absolute rounded-full"
          style={{
            top: '-15%', left: '-8%', width: 600, height: 600,
            background: 'radial-gradient(circle, rgba(249,115,22,0.16) 0%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            bottom: '-10%', right: '-6%', width: 500, height: 500,
            background: 'radial-gradient(circle, rgba(249,115,22,0.10) 0%, transparent 70%)',
            filter: 'blur(90px)',
          }}
        />
      </div>

      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-white/[0.08] bg-black/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3.5">
          <div className="text-lg font-black tracking-tight">
            Clip<span className="text-orange-500">Forge</span> AI
          </div>
          <div className="flex items-center gap-5 text-sm text-white/50">
            <Link href="/history" className="transition hover:text-white">My Clips</Link>
            {remaining !== null && (
              <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-0.5 text-xs text-orange-400">
                {remaining} free clip{remaining !== 1 ? 's' : ''} left
              </span>
            )}
          </div>
        </div>
      </nav>

      <main className="relative z-10 mx-auto max-w-3xl px-6 py-14">
        {/* Hero — shown on upload stage */}
        {stage === 'upload' && (
          <div className="mb-10 text-center">
            <div className="mb-3 text-xs font-bold uppercase tracking-widest text-orange-500">
              AI Podcast Clipper
            </div>
            <h1 className="mb-4 text-4xl font-black leading-tight tracking-tight sm:text-5xl">
              Turn podcasts into<br />
              <span className="text-orange-500">viral short clips</span>
            </h1>
            <p className="mx-auto max-w-md text-base text-white/50">
              {config.tagline}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-4 text-xs text-white/30">
              <span>✓ {config.freeClipsPerMonth} free clips/month</span>
              <span>✓ MP3, MP4, M4A, WAV</span>
              <span>✓ TikTok, Shorts, Reels</span>
              <span>✓ No signup required</span>
            </div>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            <strong>Error:</strong> {error}
            {error.includes('limit') && (
              <span className="ml-2 text-orange-400 underline cursor-pointer">Upgrade →</span>
            )}
          </div>
        )}

        {/* UPLOAD STAGE */}
        {stage === 'upload' && (
          <UploadZone onFile={handleFile} />
        )}

        {/* TRANSCRIBING / SCORING STAGES */}
        {(stage === 'transcribing' || stage === 'scoring') && (
          <div className="flex flex-col items-center justify-center gap-5 rounded-2xl border border-white/10 bg-white/[0.03] p-16">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-orange-500" />
            <div className="text-center">
              <p className="font-semibold text-white">
                {stage === 'transcribing' ? 'Transcribing audio…' : 'Scoring viral moments…'}
              </p>
              <p className="mt-1 text-sm text-white/40">
                {stage === 'transcribing'
                  ? 'Groq Whisper is converting your audio to text'
                  : 'AI is finding your top shareable moments'}
              </p>
            </div>
            <div className="flex gap-2">
              {(['transcribing', 'scoring'] as const).map((s) => (
                <div
                  key={s}
                  className={`h-1.5 w-16 rounded-full transition-colors ${
                    s === stage ? 'bg-orange-500' : stage === 'scoring' && s === 'transcribing' ? 'bg-orange-500/40' : 'bg-white/10'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* SEGMENTS STAGE */}
        {stage === 'segments' && segments.length > 0 && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Top Viral Moments</h2>
                <p className="mt-0.5 text-sm text-white/40">
                  AI found {segments.length} high-impact clips — pick one to generate
                </p>
              </div>
              <button
                onClick={reset}
                className="rounded-lg px-3 py-1.5 text-xs text-white/40 transition hover:bg-white/10 hover:text-white"
              >
                ← New upload
              </button>
            </div>

            {/* Aspect ratio selector */}
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-white/40">Format</span>
              <div className="flex gap-2">
                {config.aspectRatios.map((ar) => (
                  <button
                    key={ar.value}
                    onClick={() => handleAspectRatioChange(ar.value as '9:16' | '16:9' | '1:1')}
                    className={[
                      'rounded-lg border px-3 py-1.5 text-xs font-semibold transition',
                      aspectRatio === ar.value
                        ? 'border-orange-500/70 bg-orange-500/15 text-orange-300'
                        : 'border-white/10 text-white/40 hover:border-white/20 hover:text-white/70',
                    ].join(' ')}
                  >
                    {ar.label}
                  </button>
                ))}
              </div>
            </div>

            {segments.map((seg) => (
              <SegmentCard
                key={seg.id}
                segment={seg}
                aspectRatio={aspectRatio}
                onGenerate={handleGenerate}
                generating={generatingId === seg.id}
              />
            ))}
          </div>
        )}

        {/* GENERATING STAGE */}
        {stage === 'generating' && (
          <div className="flex flex-col items-center justify-center gap-5 rounded-2xl border border-white/10 bg-white/[0.03] p-16">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-orange-500" />
            <div className="text-center">
              <p className="font-semibold text-white">Generating your clip…</p>
              <p className="mt-1 text-sm text-white/40">
                fal.ai Kling is rendering your video (60–120s)
              </p>
            </div>
            <p className="text-xs text-white/20">Grab a coffee ☕ — this takes a minute</p>
          </div>
        )}

        {/* PREVIEW STAGE */}
        {stage === 'preview' && clipResult && (
          <ClipPreview
            videoUrl={clipResult.url}
            hookLine={clipResult.hookLine}
            clipTitle={clipResult.clipTitle}
            provider={clipResult.provider}
            aspectRatio={aspectRatio}
            onAspectRatioChange={handleAspectRatioChange}
            onBack={() => setStage('segments')}
          />
        )}
      </main>

      <footer className="relative z-10 border-t border-white/[0.06] px-6 py-6 text-center text-xs text-white/20">
        © {new Date().getFullYear()} ClipForge AI · AI Podcast Clip Generator ·{' '}
        <Link href="/history" className="ml-1 text-white/30 hover:text-white/50">My Clips</Link>
      </footer>
    </div>
  )
}
