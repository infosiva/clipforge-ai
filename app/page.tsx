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

// ── Video clip cards for animated demo panel ──────────────
const CLIP_CARDS = [
  {
    title: 'The AI Revolution Moment',
    hook: '"This changes everything about how we work"',
    score: 94,
    time: '4:12 – 5:48',
    format: '9:16',
    platform: 'TikTok',
    platformColor: '#06b6d4',
    thumb: 'from-slate-800 to-slate-900',
  },
  {
    title: 'Contrarian Take on Remote Work',
    hook: '"Everyone got it completely backwards"',
    score: 87,
    time: '12:03 – 13:21',
    format: '16:9',
    platform: 'YouTube',
    platformColor: '#ef4444',
    thumb: 'from-cyan-900 to-slate-900',
  },
  {
    title: 'The Unexpected Breakthrough',
    hook: '"Nobody saw this coming, not even me"',
    score: 91,
    time: '22:47 – 24:10',
    format: '1:1',
    platform: 'LinkedIn',
    platformColor: '#0284c7',
    thumb: 'from-indigo-900 to-slate-900',
  },
]

const MOBILE_STEPS = [
  { icon: '🎧', label: 'Upload', desc: 'MP3, MP4, WAV — drop it in', color: '#06b6d4' },
  { icon: '📝', label: 'Transcribe', desc: 'Groq Whisper converts to text', color: '#0284c7' },
  { icon: '🎯', label: 'Score', desc: 'AI finds viral moments', color: '#059669' },
  { icon: '✂️', label: 'Export', desc: 'Download 9:16 / 16:9 / 1:1', color: '#7c3aed' },
]

function MobileDemoStrip() {
  const [active, setActive] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setActive(a => (a + 1) % MOBILE_STEPS.length), 2200)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="lg:hidden mb-6">
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
              background: active === i ? `${s.color}12` : '#f1f5f9',
              border: `1px solid ${active === i ? `${s.color}35` : '#e2e8f0'}`,
              borderRadius: 14, padding: '14px 14px',
              transition: 'background 250ms cubic-bezier(0.23,1,0.32,1), border-color 250ms cubic-bezier(0.23,1,0.32,1)',
              cursor: 'pointer',
            }}
          >
            <div style={{ fontSize: '1.4rem', marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: active === i ? s.color : '#374151', marginBottom: 3 }}>{s.label}</div>
            <div style={{ fontSize: '0.68rem', color: '#94a3b8', lineHeight: 1.4 }}>{s.desc}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 5, justifyContent: 'center', marginTop: 8 }}>
        {MOBILE_STEPS.map((s, i) => (
          <div
            key={i}
            onClick={() => setActive(i)}
            style={{
              width: active === i ? 16 : 5, height: 5, borderRadius: 999,
              background: active === i ? '#06b6d4' : '#cbd5e1',
              transition: 'width 250ms cubic-bezier(0.23,1,0.32,1), background 250ms cubic-bezier(0.23,1,0.32,1)',
              cursor: 'pointer',
            }}
          />
        ))}
      </div>
    </div>
  )
}

// Stacked video clip cards — cycles through states
function VideoDemoPanel() {
  const [activeCard, setActiveCard] = useState(0)
  const [phase, setPhase] = useState<'scanning' | 'clips' | 'export'>('scanning')
  const [waveProgress, setWaveProgress] = useState(0)

  useEffect(() => {
    if (phase === 'scanning') {
      // Animate wave progress
      const interval = setInterval(() => {
        setWaveProgress(p => {
          if (p >= 100) {
            clearInterval(interval)
            setTimeout(() => setPhase('clips'), 400)
            return 100
          }
          return p + 2
        })
      }, 60)
      return () => clearInterval(interval)
    }
    if (phase === 'clips') {
      const t = setInterval(() => {
        setActiveCard(c => (c + 1) % CLIP_CARDS.length)
      }, 2800)
      return () => clearInterval(t)
    }
    if (phase === 'export') {
      const t = setTimeout(() => {
        setPhase('scanning')
        setWaveProgress(0)
        setActiveCard(0)
      }, 3200)
      return () => clearTimeout(t)
    }
  }, [phase])

  useEffect(() => {
    if (phase === 'clips') {
      const t = setTimeout(() => setPhase('export'), 9000)
      return () => clearTimeout(t)
    }
  }, [phase])

  const card = CLIP_CARDS[activeCard]

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 20,
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(6,182,212,0.08), 0 2px 8px rgba(0,0,0,0.06)',
        position: 'relative',
      }}
    >
      {/* App chrome bar */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid #f1f5f9',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: '#f8fafc',
      }}>
        <div style={{ display: 'flex', gap: 5 }}>
          {['#ff5f57', '#ffbd2e', '#28c840'].map((c, i) => (
            <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
          ))}
        </div>
        <div style={{
          flex: 1, height: 22, background: '#e2e8f0', borderRadius: 6,
          display: 'flex', alignItems: 'center', paddingLeft: 8,
        }}>
          <span style={{ fontSize: '0.65rem', color: '#64748b' }}>clipforge.ai — AI clip editor</span>
        </div>
      </div>

      {/* Phase: scanning */}
      {phase === 'scanning' && (
        <div style={{ padding: '20px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%', background: '#06b6d4',
              boxShadow: '0 0 8px rgba(6,182,212,0.5)',
              animation: 'cfPulse 1.2s ease infinite',
            }} />
            <span style={{ fontSize: '0.78rem', color: '#06b6d4', fontWeight: 600 }}>Scanning audio for viral moments…</span>
          </div>
          {/* Waveform */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, height: 56, marginBottom: 12 }}>
            {[18,32,45,28,55,70,48,35,62,80,68,45,30,52,75,88,72,55,40,65,82,70,50,38,60,78,65,48,35,55,72,60,42,30,50,68].map((h, i) => (
              <div key={i} style={{
                flex: 1, height: `${h}%`, borderRadius: 2,
                background: (i / 36) * 100 <= waveProgress ? '#06b6d4' : '#e2e8f0',
                transition: 'background 80ms ease',
              }} />
            ))}
          </div>
          {/* Progress bar */}
          <div style={{ height: 4, background: '#f1f5f9', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{
              height: '100%', background: 'linear-gradient(90deg, #06b6d4, #0284c7)',
              borderRadius: 999, width: `${waveProgress}%`,
              transition: 'width 60ms linear',
            }} />
          </div>
          <div style={{ marginTop: 8, fontSize: '0.7rem', color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
            <span>my-podcast-ep47.mp3</span>
            <span style={{ color: '#06b6d4', fontWeight: 600 }}>{waveProgress}%</span>
          </div>
          {/* Scrolling transcript */}
          <div style={{ marginTop: 12, padding: '8px 10px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
              "…and that's when I realized the entire industry was{' '}
              <span style={{ background: 'rgba(6,182,212,0.12)', color: '#0284c7', borderRadius: 3, padding: '1px 4px' }}>missing the point</span>
              {' '}about AI…"
            </span>
          </div>
        </div>
      )}

      {/* Phase: clips found */}
      {phase === 'clips' && (
        <div style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
              <span style={{ color: '#06b6d4', fontWeight: 700 }}>{CLIP_CARDS.length} viral moments</span> found
            </span>
            <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Pick one to export</span>
          </div>
          {/* Stacked clip cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {CLIP_CARDS.map((c, i) => (
              <div
                key={i}
                onClick={() => setActiveCard(i)}
                style={{
                  border: `1.5px solid ${i === activeCard ? 'rgba(6,182,212,0.45)' : '#e2e8f0'}`,
                  background: i === activeCard ? 'rgba(6,182,212,0.04)' : '#fafafa',
                  borderRadius: 12,
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  cursor: 'pointer',
                  transition: 'border-color 200ms cubic-bezier(0.23,1,0.32,1), background 200ms cubic-bezier(0.23,1,0.32,1)',
                }}
              >
                {/* Video thumbnail placeholder */}
                <div style={{
                  width: 44, height: 44, borderRadius: 8, flexShrink: 0,
                  background: `linear-gradient(135deg, #0f172a, #1e293b)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: `1px solid ${i === activeCard ? 'rgba(6,182,212,0.3)' : '#e2e8f0'}`,
                  position: 'relative', overflow: 'hidden',
                }}>
                  <div style={{
                    width: 0, height: 0,
                    borderTop: '6px solid transparent', borderBottom: '6px solid transparent',
                    borderLeft: `10px solid ${i === activeCard ? '#06b6d4' : 'rgba(255,255,255,0.4)'}`,
                    marginLeft: 2,
                    transition: 'border-left-color 200ms ease',
                  }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '0.75rem', fontWeight: 600, color: '#0f172a',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>{c.title}</div>
                  <div style={{ fontSize: '0.62rem', color: '#94a3b8', marginTop: 2 }}>{c.time}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <div style={{
                    fontSize: '0.65rem', fontWeight: 800,
                    color: c.score >= 90 ? '#059669' : '#0284c7',
                  }}>{c.score}</div>
                  <div style={{
                    fontSize: '0.6rem', padding: '1px 6px', borderRadius: 999,
                    background: `${c.platformColor}12`, color: c.platformColor,
                    border: `1px solid ${c.platformColor}30`,
                  }}>{c.format}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Phase: export ready */}
      {phase === 'export' && (
        <div style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#059669' }} />
            <span style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 600 }}>Clip ready — tap to download</span>
          </div>
          {/* Video preview card */}
          <div style={{ background: '#f1f5f9', borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
            <div style={{
              height: 96, background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0c1a2e 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: '50%',
                background: 'rgba(6,182,212,0.95)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 20px rgba(6,182,212,0.45)',
              }}>
                <div style={{
                  width: 0, height: 0,
                  borderTop: '7px solid transparent', borderBottom: '7px solid transparent',
                  borderLeft: '13px solid white', marginLeft: 2,
                }} />
              </div>
              <div style={{
                position: 'absolute', bottom: 6, left: 8, right: 8,
                background: 'rgba(0,0,0,0.72)', borderRadius: 5, padding: '4px 7px', textAlign: 'center',
              }}>
                <span style={{ fontSize: '0.62rem', color: '#fff', fontWeight: 700 }}>
                  {CLIP_CARDS[activeCard % CLIP_CARDS.length].hook}
                </span>
              </div>
            </div>
            <div style={{ padding: '8px 12px', display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{
                fontSize: '0.62rem', background: 'rgba(6,182,212,0.1)',
                border: '1px solid rgba(6,182,212,0.25)', color: '#0284c7',
                borderRadius: 999, padding: '2px 7px',
              }}>9:16</span>
              <span style={{
                fontSize: '0.62rem', background: 'rgba(5,150,105,0.1)',
                border: '1px solid rgba(5,150,105,0.25)', color: '#059669',
                borderRadius: 999, padding: '2px 7px',
              }}>{CLIP_CARDS[activeCard % CLIP_CARDS.length].score} viral</span>
              <span style={{ fontSize: '0.62rem', color: '#94a3b8', marginLeft: 'auto' }}>Kling v1.6</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <div style={{
              flex: 1, background: '#06b6d4', borderRadius: 8, padding: '8px 0',
              textAlign: 'center', fontSize: '0.72rem', fontWeight: 700, color: '#fff',
              cursor: 'pointer',
            }}>↓ Download MP4</div>
            <div style={{
              background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8,
              padding: '8px 14px', fontSize: '0.72rem', color: '#64748b', cursor: 'pointer',
            }}>Copy caption</div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes cfPulse { 0%,100%{opacity:1;} 50%{opacity:0.35;} }
        @keyframes cfFadeUp { from{opacity:0;transform:translateY(8px);} to{opacity:1;transform:translateY(0);} }
        @media (prefers-reduced-motion: reduce) {
          [style*="animation"] { animation: none !important; }
        }
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
    <div
      className="min-h-screen"
      style={{ background: '#f8fafc', color: '#0f172a', fontFamily: 'Inter, sans-serif' }}
    >
      {/* Subtle cyan glow — light theme */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute rounded-full" style={{ top: '-12%', right: '-5%', width: 560, height: 560, background: 'radial-gradient(circle, rgba(6,182,212,0.07) 0%, transparent 70%)', filter: 'blur(90px)' }} />
        <div className="absolute rounded-full" style={{ bottom: '-8%', left: '-4%', width: 440, height: 440, background: 'radial-gradient(circle, rgba(2,132,199,0.05) 0%, transparent 70%)', filter: 'blur(80px)' }} />
      </div>

      {/* Sticky glass navbar */}
      <nav className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <div className="text-lg font-black tracking-tight text-slate-900">
            Clip<span style={{ color: '#06b6d4' }}>Forge</span>
            <span className="ml-1 text-slate-500 font-medium text-base">AI</span>
          </div>
          <div className="flex items-center gap-5 text-sm text-slate-500">
            <Link href="/history" className="transition-colors duration-150 hover:text-slate-900">My Clips</Link>
            {remaining !== null && (
              <span
                className="rounded-full px-3 py-0.5 text-xs font-semibold"
                style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.25)', color: '#0284c7' }}
              >
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
              <div
                className="mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-widest"
                style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)', color: '#0284c7' }}
              >
                AI Video Clipper
              </div>

              <h1 className="mb-4 text-4xl font-black leading-[1.08] tracking-tight sm:text-5xl text-slate-900">
                Turn long videos into<br />
                <span style={{ color: '#06b6d4' }}>viral short clips</span>
              </h1>
              <p className="mb-6 max-w-md text-base text-slate-500 leading-relaxed">
                Upload any podcast or video. AI finds the best moments, cuts to platform-perfect length, and adds captions — in under 60 seconds.
              </p>

              {/* Steps row */}
              <div className="mb-6 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                {['Upload', 'Transcribe', 'Score', 'Export'].map((s, i) => (
                  <span key={s} className="flex items-center gap-2">
                    <span
                      className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold"
                      style={{ border: '1.5px solid rgba(6,182,212,0.4)', color: '#0284c7' }}
                    >
                      {i + 1}
                    </span>
                    <span className="text-slate-600">{s}</span>
                    {i < 3 && <span className="text-slate-300">→</span>}
                  </span>
                ))}
              </div>

              {/* Mobile demo strip */}
              <MobileDemoStrip />

              {/* Error banner */}
              {error && (
                <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
                  <strong>Error:</strong> {error}
                  {error.includes('limit') && <span className="ml-2 cursor-pointer underline" style={{ color: '#0284c7' }}>Upgrade →</span>}
                </div>
              )}

              <UploadZone onFile={handleFile} />

              {/* Trust badges */}
              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-slate-500">
                  <span className="font-bold" style={{ color: '#059669' }}>✓</span> No watermark on free plan
                </span>
                <span className="text-slate-300 select-none">·</span>
                <span className="flex items-center gap-1.5 text-slate-500">
                  <span className="font-bold" style={{ color: '#059669' }}>✓</span> Auto-captions included
                </span>
                <span className="text-slate-300 select-none">·</span>
                <span className="flex items-center gap-1.5 text-slate-500">
                  <span className="font-bold" style={{ color: '#059669' }}>✓</span> Up to {config.freeClipsPerMonth} clips free
                </span>
              </div>

              <ClipStats />
            </div>

            {/* Right: animated video demo — desktop only */}
            <div className="hidden lg:block">
              <div className="mb-3 flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Live preview</span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>
              <VideoDemoPanel />
              <p className="mt-3 text-center text-xs text-slate-400">AI scans, scores, and exports — automatically</p>
            </div>
          </div>
        )}

        {/* TRANSCRIBING / SCORING */}
        {(stage === 'transcribing' || stage === 'scoring') && (
          <div
            className="flex flex-col items-center justify-center gap-5 rounded-2xl p-16"
            style={{ background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}
          >
            <div
              className="h-10 w-10 animate-spin rounded-full border-2"
              style={{ borderColor: '#e2e8f0', borderTopColor: '#06b6d4' }}
            />
            <div className="text-center">
              <p className="font-semibold text-slate-900">
                {stage === 'transcribing' ? 'Transcribing audio…' : 'Scoring viral moments…'}
              </p>
              <p className="mt-1 text-sm text-slate-400">
                {stage === 'transcribing' ? 'Groq Whisper converting audio to text' : 'AI finding your top shareable moments'}
              </p>
            </div>
            <div className="flex gap-2">
              {(['transcribing', 'scoring'] as const).map((s) => (
                <div
                  key={s}
                  className="h-1.5 w-16 rounded-full transition-colors"
                  style={{
                    background: s === stage ? '#06b6d4' : stage === 'scoring' && s === 'transcribing' ? 'rgba(6,182,212,0.35)' : '#e2e8f0',
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* SEGMENTS */}
        {stage === 'segments' && segments.length > 0 && (
          <div className="flex flex-col gap-4">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
                <strong>Error:</strong> {error}
              </div>
            )}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Top Viral Moments</h2>
                <p className="mt-0.5 text-sm text-slate-400">AI found {segments.length} high-impact clips — pick one to generate</p>
              </div>
              <button
                onClick={reset}
                className="rounded-lg px-3 py-1.5 text-xs text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                style={{ border: '1px solid #e2e8f0' }}
              >
                ← New upload
              </button>
            </div>

            <div
              className="rounded-xl p-3"
              style={{ background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
            >
              <PlatformFilter segments={segments} onFilter={setFilteredSegments} />
            </div>

            <div
              className="flex items-center gap-3 rounded-xl p-3"
              style={{ background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
            >
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Format</span>
              <div className="flex gap-2">
                {config.aspectRatios.map((ar) => (
                  <button
                    key={ar.value}
                    onClick={() => handleAspectRatioChange(ar.value as '9:16' | '16:9' | '1:1')}
                    className="rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors"
                    style={aspectRatio === ar.value
                      ? { borderColor: 'rgba(6,182,212,0.5)', background: 'rgba(6,182,212,0.06)', color: '#0284c7' }
                      : { borderColor: '#e2e8f0', color: '#94a3b8' }
                    }
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
              <p className="text-center text-sm text-slate-400 py-6">No clips match this platform filter — showing all above</p>
            )}
          </div>
        )}

        {/* GENERATING */}
        {stage === 'generating' && (
          <div
            className="flex flex-col items-center justify-center gap-5 rounded-2xl p-16"
            style={{ background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}
          >
            <div
              className="h-10 w-10 animate-spin rounded-full border-2"
              style={{ borderColor: '#e2e8f0', borderTopColor: '#06b6d4' }}
            />
            <div className="text-center">
              <p className="font-semibold text-slate-900">Generating your clip…</p>
              <p className="mt-1 text-sm text-slate-400">fal.ai Kling is rendering your video (60–120s)</p>
            </div>
            <p className="text-xs text-slate-300">Grab a coffee — this takes a minute</p>
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

      <footer
        className="relative z-10 px-6 py-6 text-center text-xs text-slate-400"
        style={{ borderTop: '1px solid #e2e8f0', background: 'rgba(255,255,255,0.6)' }}
      >
        © {new Date().getFullYear()} ClipForge AI · AI Video Clip Generator ·{' '}
        <Link href="/history" className="ml-1 text-slate-500 hover:text-slate-900 transition-colors">My Clips</Link>
      </footer>
    </div>
  )
}
