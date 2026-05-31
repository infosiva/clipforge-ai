'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import config from '@/vertical.config'
import { saveClip } from '@/lib/storage'
import type { ScoredSegment } from '@/lib/score'
import UploadZone from '@/components/UploadZone'
import SegmentCard from '@/components/SegmentCard'
import ClipPreview from '@/components/ClipPreview'
import PlatformFilter from '@/components/PlatformFilter'
import ClipStats from '@/components/ClipStats'

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

const MOBILE_STEPS = [
  { icon: '🎧', label: 'Upload', desc: 'MP3, MP4, WAV — drop it in', color: '#f97316' },
  { icon: '📝', label: 'Transcribe', desc: 'Groq Whisper converts to text', color: '#a78bfa' },
  { icon: '🎯', label: 'Score', desc: 'AI finds viral moments', color: '#4ade80' },
  { icon: '✂️', label: 'Export', desc: 'Download 9:16 / 16:9 / 1:1', color: '#38bdf8' },
]

function MobileDemoStrip() {
  const [active, setActive] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setActive(a => (a + 1) % MOBILE_STEPS.length), 2200)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="lg:hidden mb-6">
      {/* Snap-scroll swipeable strip */}
      <div
        style={{
          display: 'flex', gap: 10, overflowX: 'auto', scrollSnapType: 'x mandatory',
          scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', paddingBottom: 4,
        }}
      >
        {MOBILE_STEPS.map((s, i) => (
          <div
            key={i}
            onClick={() => setActive(i)}
            style={{
              minWidth: 130, flexShrink: 0, scrollSnapAlign: 'start',
              background: active === i ? `${s.color}12` : 'rgba(255,255,255,0.03)',
              border: `1px solid ${active === i ? `${s.color}35` : 'rgba(255,255,255,0.07)'}`,
              borderRadius: 14, padding: '14px 14px',
              transition: 'all 250ms cubic-bezier(0.23,1,0.32,1)',
              cursor: 'pointer',
            }}
          >
            <div style={{ fontSize: '1.4rem', marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: active === i ? s.color : '#fff', marginBottom: 3 }}>{s.label}</div>
            <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)', lineHeight: 1.4 }}>{s.desc}</div>
          </div>
        ))}
      </div>
      {/* Dot indicators */}
      <div style={{ display: 'flex', gap: 5, justifyContent: 'center', marginTop: 8 }}>
        {MOBILE_STEPS.map((_, i) => (
          <div key={i} onClick={() => setActive(i)} style={{ width: active === i ? 16 : 5, height: 5, borderRadius: 999, background: active === i ? '#f97316' : 'rgba(255,255,255,0.15)', transition: 'all 250ms cubic-bezier(0.23,1,0.32,1)', cursor: 'pointer' }} />
        ))}
      </div>
    </div>
  )
}

// Animated demo panel — cycles through 3 states showing what the tool does
const DEMO_SEGMENTS = [
  { title: 'The AI Revolution Moment', hook: '"This changes everything about how we work"', score: 94, time: '4:12 – 5:48' },
  { title: 'Contrarian Take on Remote Work', hook: '"Everyone got it completely backwards"', score: 87, time: '12:03 – 13:21' },
  { title: 'The Unexpected Breakthrough', hook: '"Nobody saw this coming, not even me"', score: 91, time: '22:47 – 24:10' },
]

function DemoPanel() {
  const [step, setStep] = useState(0) // 0=waveform, 1=segments, 2=clip
  const [activeSegment, setActiveSegment] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const cycle = [3500, 3500, 4000]
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(() => {
        if (step === 2) {
          setStep(0)
          setActiveSegment((s) => (s + 1) % DEMO_SEGMENTS.length)
        } else {
          setStep((s) => s + 1)
        }
        setVisible(true)
      }, 300)
    }, cycle[step])
    return () => clearTimeout(timer)
  }, [step])

  const seg = DEMO_SEGMENTS[activeSegment]

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 20,
        overflow: 'hidden',
        height: 340,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top bar */}
      <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: i===0?'#ff5f57':i===1?'#ffbd2e':'#28c840' }} />
          ))}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginLeft: 4 }}>
          {step === 0 ? 'my-podcast-ep47.mp3' : step === 1 ? 'AI found 3 viral moments' : 'Clip ready to export'}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: step === i ? '#f97316' : 'rgba(255,255,255,0.12)', transition: 'background 300ms ease' }} />
          ))}
        </div>
      </div>

      {/* Content area */}
      <div
        style={{
          flex: 1, padding: '20px 18px',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(6px)',
          transition: 'opacity 280ms cubic-bezier(0.23,1,0.32,1), transform 280ms cubic-bezier(0.23,1,0.32,1)',
        }}
      >
        {/* Step 0: Waveform + transcribing */}
        {step === 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f97316', boxShadow: '0 0 8px #f97316', animation: 'pulse 1.2s ease infinite' }} />
              <span style={{ fontSize: '0.78rem', color: '#f97316', fontWeight: 600 }}>Transcribing with Groq Whisper…</span>
            </div>
            {/* Waveform bars */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, height: 60, marginBottom: 16 }}>
              {[18,32,45,28,55,70,48,35,62,80,68,45,30,52,75,88,72,55,40,65,82,70,50,38,60,78,65,48,35,55,72,60,42,30,50,68,80,65,48,35,58,75,62,45,32,52,70,58,40,28,48,65,52,38,28,45].map((h, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1, height: `${h}%`, borderRadius: 2,
                    background: i < 30 ? '#f97316' : 'rgba(255,255,255,0.12)',
                    transition: 'background 100ms ease',
                  }}
                />
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {['00:00', '05:30', '11:00', '16:30', '22:00', '27:30'].map((t, i) => (
                <span key={t} style={{ fontSize: '0.68rem', color: i < 3 ? 'rgba(249,115,22,0.7)' : 'rgba(255,255,255,0.2)', fontVariantNumeric: 'tabular-nums' }}>{t}</span>
              ))}
            </div>
            <div style={{ marginTop: 14, fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>
              <span style={{ color: 'rgba(255,255,255,0.6)' }}>"…and that's when I realized the entire industry was</span>
              <span style={{ background: 'rgba(249,115,22,0.2)', color: '#f97316', borderRadius: 3, padding: '0 3px', margin: '0 2px' }}>missing the point</span>
              <span style={{ color: 'rgba(255,255,255,0.6)' }}> about AI…"</span>
            </div>
          </div>
        )}

        {/* Step 1: Scored segments */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>AI scored {DEMO_SEGMENTS.length} viral moments — pick one</div>
            {DEMO_SEGMENTS.map((s, i) => (
              <div
                key={i}
                onClick={() => setActiveSegment(i)}
                style={{
                  background: i === activeSegment ? 'rgba(249,115,22,0.08)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${i === activeSegment ? 'rgba(249,115,22,0.3)' : 'rgba(255,255,255,0.07)'}`,
                  borderRadius: 10, padding: '10px 12px',
                  display: 'flex', alignItems: 'center', gap: 10,
                  cursor: 'pointer',
                  transition: 'all 200ms cubic-bezier(0.23,1,0.32,1)',
                  animationDelay: `${i * 60}ms`,
                  animation: 'fadeUp 300ms ease-out both',
                }}
              >
                <div style={{
                  minWidth: 36, height: 36, borderRadius: 8,
                  background: s.score >= 90 ? 'rgba(74,222,128,0.12)' : 'rgba(249,115,22,0.12)',
                  border: `1px solid ${s.score >= 90 ? 'rgba(74,222,128,0.25)' : 'rgba(249,115,22,0.25)'}`,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: s.score >= 90 ? '#4ade80' : '#f97316', lineHeight: 1 }}>{s.score}</span>
                  <span style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.3)' }}>viral</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.title}</div>
                  <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)' }}>{s.time}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Step 2: Clip card ready */}
        {step === 2 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80' }} />
              <span style={{ fontSize: '0.78rem', color: '#4ade80', fontWeight: 600 }}>Clip generated — ready to export</span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' }}>
              {/* Mock video frame */}
              <div style={{ height: 110, background: 'linear-gradient(135deg, #1a0a00 0%, #0a0a0f 50%, #1a0500 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(249,115,22,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(249,115,22,0.4)' }}>
                  <div style={{ width: 0, height: 0, borderTop: '7px solid transparent', borderBottom: '7px solid transparent', borderLeft: '13px solid white', marginLeft: 2 }} />
                </div>
                {/* caption overlay */}
                <div style={{ position: 'absolute', bottom: 8, left: 8, right: 8, background: 'rgba(0,0,0,0.75)', borderRadius: 6, padding: '5px 8px', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.65rem', color: '#fff', fontWeight: 700 }}>{seg.hook}</span>
                </div>
              </div>
              <div style={{ padding: '10px 12px', display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: '0.65rem', background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.25)', color: '#f97316', borderRadius: 999, padding: '2px 8px' }}>9:16</span>
                <span style={{ fontSize: '0.65rem', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', color: '#4ade80', borderRadius: 999, padding: '2px 8px' }}>{seg.score} virality</span>
                <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.25)', marginLeft: 'auto' }}>Kling v1.6</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <div style={{ flex: 1, background: '#f97316', borderRadius: 8, padding: '7px 0', textAlign: 'center', fontSize: '0.72rem', fontWeight: 700, color: '#fff' }}>↓ Download MP4</div>
              <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '7px 14px', fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)' }}>Copy caption</div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:0.4;} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px);} to{opacity:1;transform:translateY(0);} }
      `}</style>
    </div>
  )
}

export default function HomePage() {
  const [stage, setStage] = useState<Stage>('upload')
  const [segments, setSegments] = useState<ScoredSegment[]>([])
  const [filteredSegments, setFilteredSegments] = useState<ScoredSegment[]>([])
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
      const form = new FormData()
      form.append('file', file)
      const transcribeRes = await fetch('/api/transcribe', { method: 'POST', body: form })
      const transcribeData = await transcribeRes.json() as { segments?: unknown[]; error?: string }
      if (!transcribeRes.ok || transcribeData.error) {
        setError(transcribeData.error ?? 'Transcription failed')
        setStage('upload')
        return
      }
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
      const segs = scoreData.segments ?? []
      setSegments(segs)
      setFilteredSegments(segs)
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
        setError(data.upgradeRequired ? 'Free clip limit reached. Upgrade to continue.' : (data.error ?? 'Clip generation failed'))
        setStage('segments')
        setGeneratingId(null)
        return
      }
      setClipResult(data)
      setRemaining(data.remaining)
      setStage('preview')
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
      {/* Blob bg */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute rounded-full" style={{ top: '-15%', left: '-8%', width: 600, height: 600, background: 'radial-gradient(circle, rgba(249,115,22,0.16) 0%, transparent 70%)', filter: 'blur(80px)' }} />
        <div className="absolute rounded-full" style={{ bottom: '-10%', right: '-6%', width: 500, height: 500, background: 'radial-gradient(circle, rgba(249,115,22,0.10) 0%, transparent 70%)', filter: 'blur(90px)' }} />
      </div>

      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-white/[0.08] bg-black/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <div className="text-lg font-black tracking-tight">
            Clip<span className="text-orange-500">Forge</span> AI
          </div>
          <div className="flex items-center gap-5 text-sm text-white/50">
            <Link href="/history" className="transition-colors duration-150 hover:text-white">My Clips</Link>
            {remaining !== null && (
              <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-0.5 text-xs text-orange-400">
                {remaining} free clip{remaining !== 1 ? 's' : ''} left
              </span>
            )}
          </div>
        </div>
      </nav>

      <main className="relative z-10 mx-auto max-w-6xl px-6 py-12">
        {/* UPLOAD STAGE — split layout */}
        {stage === 'upload' && (
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16 lg:items-center">
            {/* Left: hero + upload */}
            <div>
              <div className="mb-3 text-xs font-bold uppercase tracking-widest text-orange-500">AI Video Clip Generator</div>

              <h1 className="mb-4 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl">
                Turn any long video into<br />
                <span className="text-orange-500">platform-ready clips</span><br />
                <span className="text-white/70 text-3xl sm:text-4xl">— in 60 seconds, no watermark.</span>
              </h1>
              <p className="mb-6 max-w-md text-base text-white/50 leading-relaxed">
                AI finds your best moments, cuts them to platform-perfect length, and adds captions automatically.
              </p>

              {/* Steps row */}
              <div className="mb-6 flex items-center gap-2 text-xs text-white/30">
                {['Upload', 'Transcribe', 'Score', 'Export'].map((s, i) => (
                  <span key={s} className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full border border-white/10 text-[10px] font-bold text-white/40">{i + 1}</span>
                    <span>{s}</span>
                    {i < 3 && <span className="text-white/15">→</span>}
                  </span>
                ))}
              </div>

              {/* Mobile demo strip — shown only on mobile */}
              <MobileDemoStrip />

              {/* Error banner */}
              {error && (
                <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                  <strong>Error:</strong> {error}
                  {error.includes('limit') && <span className="ml-2 cursor-pointer text-orange-400 underline">Upgrade →</span>}
                </div>
              )}

              <UploadZone onFile={handleFile} />

              {/* Trust badge strip */}
              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-white/40">
                  <span className="text-green-400 font-bold">✓</span> No watermark on free plan
                </span>
                <span className="text-white/15 select-none">·</span>
                <span className="flex items-center gap-1.5 text-white/40">
                  <span className="text-green-400 font-bold">✓</span> Auto-captions included
                </span>
                <span className="text-white/15 select-none">·</span>
                <span className="flex items-center gap-1.5 text-white/40">
                  <span className="text-green-400 font-bold">✓</span> Up to {config.freeClipsPerMonth} clips free
                </span>
              </div>

              {/* Processing stats */}
              <ClipStats />
            </div>

            {/* Right: animated demo — desktop only */}
            <div className="hidden lg:block">
              <div className="mb-3 flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-widest text-white/25">How it works</span>
                <div className="h-px flex-1 bg-white/[0.06]" />
              </div>
              <DemoPanel />
              <p className="mt-3 text-center text-xs text-white/20">AI finds your best moments automatically</p>
            </div>
          </div>
        )}

        {/* TRANSCRIBING / SCORING */}
        {(stage === 'transcribing' || stage === 'scoring') && (
          <div className="flex flex-col items-center justify-center gap-5 rounded-2xl border border-white/10 bg-white/[0.03] p-16">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-orange-500" />
            <div className="text-center">
              <p className="font-semibold text-white">
                {stage === 'transcribing' ? 'Transcribing audio…' : 'Scoring viral moments…'}
              </p>
              <p className="mt-1 text-sm text-white/40">
                {stage === 'transcribing' ? 'Groq Whisper converting audio to text' : 'AI finding your top shareable moments'}
              </p>
            </div>
            <div className="flex gap-2">
              {(['transcribing', 'scoring'] as const).map((s) => (
                <div key={s} className={`h-1.5 w-16 rounded-full transition-colors ${s === stage ? 'bg-orange-500' : stage === 'scoring' && s === 'transcribing' ? 'bg-orange-500/40' : 'bg-white/10'}`} />
              ))}
            </div>
          </div>
        )}

        {/* SEGMENTS */}
        {stage === 'segments' && segments.length > 0 && (
          <div className="flex flex-col gap-4">
            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                <strong>Error:</strong> {error}
              </div>
            )}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Top Viral Moments</h2>
                <p className="mt-0.5 text-sm text-white/40">AI found {segments.length} high-impact clips — pick one to generate</p>
              </div>
              <button onClick={reset} className="rounded-lg px-3 py-1.5 text-xs text-white/40 transition hover:bg-white/10 hover:text-white">← New upload</button>
            </div>

            {/* Platform filter tabs */}
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <PlatformFilter segments={segments} onFilter={setFilteredSegments} />
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-white/40">Format</span>
              <div className="flex gap-2">
                {config.aspectRatios.map((ar) => (
                  <button
                    key={ar.value}
                    onClick={() => handleAspectRatioChange(ar.value as '9:16' | '16:9' | '1:1')}
                    className={['rounded-lg border px-3 py-1.5 text-xs font-semibold transition', aspectRatio === ar.value ? 'border-orange-500/70 bg-orange-500/15 text-orange-300' : 'border-white/10 text-white/40 hover:border-white/20 hover:text-white/70'].join(' ')}
                  >
                    {ar.label}
                  </button>
                ))}
              </div>
            </div>

            <AnimatePresence mode="popLayout">
              {(filteredSegments.length > 0 ? filteredSegments : segments).map((seg, i) => (
                <motion.div
                  key={seg.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.22, delay: i * 0.07, ease: [0.23, 1, 0.32, 1] }}
                >
                  <SegmentCard segment={seg} aspectRatio={aspectRatio} onGenerate={handleGenerate} generating={generatingId === seg.id} />
                </motion.div>
              ))}
            </AnimatePresence>

            {filteredSegments.length === 0 && (
              <p className="text-center text-sm text-white/30 py-6">No clips match this platform filter — showing all above</p>
            )}
          </div>
        )}

        {/* GENERATING */}
        {stage === 'generating' && (
          <div className="flex flex-col items-center justify-center gap-5 rounded-2xl border border-white/10 bg-white/[0.03] p-16">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-orange-500" />
            <div className="text-center">
              <p className="font-semibold text-white">Generating your clip…</p>
              <p className="mt-1 text-sm text-white/40">fal.ai Kling is rendering your video (60–120s)</p>
            </div>
            <p className="text-xs text-white/20">Grab a coffee ☕ — this takes a minute</p>
          </div>
        )}

        {/* PREVIEW */}
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
