'use client'
import { motion } from 'framer-motion'
import { useState, useRef } from 'react'
import Link from 'next/link'
import config from '@/vertical.config'
import { saveClip } from '@/lib/storage'

const ACCENT = '#f97316'   // orange-500
const DARK = '#0a0a0f'
const CARD = 'rgba(255,255,255,0.04)'
const BORDER = 'rgba(255,255,255,0.08)'

const EXAMPLE_PROMPTS = [
  'A lone wolf running through a misty forest at dawn',
  'Neon-lit Tokyo street at night, rain reflecting lights',
  'Waves crashing against rocky cliffs at golden hour',
  'Astronaut floating in space above Earth, cinematic',
  'Coffee being poured in slow motion, warm bokeh',
]

type Status = 'idle' | 'enhancing' | 'generating' | 'done' | 'error'

export default function HomePage() {
  const [prompt, setPrompt] = useState('')
  const [duration, setDuration] = useState(config.defaultDuration)
  const [aspectRatio, setAspectRatio] = useState(config.aspectRatios[0].value)
  const [status, setStatus] = useState<Status>('idle')
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [enhancedPrompt, setEnhancedPrompt] = useState<string | null>(null)
  const [provider, setProvider] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  const isLoading = status === 'enhancing' || status === 'generating'

  async function handleGenerate() {
    if (!prompt.trim() || isLoading) return
    setStatus('enhancing')
    setVideoUrl(null)
    setEnhancedPrompt(null)
    setError(null)

    try {
      setStatus('generating')
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim(), duration, aspectRatio }),
      })
      const data = await res.json() as {
        videoUrl?: string
        enhancedPrompt?: string
        provider?: string
        error?: string
      }

      if (!res.ok || data.error) {
        setError(data.error ?? 'Generation failed')
        setStatus('error')
        return
      }

      setVideoUrl(data.videoUrl ?? null)
      setEnhancedPrompt(data.enhancedPrompt ?? null)
      setProvider(data.provider ?? null)
      setStatus('done')

      // Save to history
      if (data.videoUrl) {
        saveClip({
          prompt: prompt.trim(),
          enhancedPrompt: data.enhancedPrompt ?? prompt.trim(),
          videoUrl: data.videoUrl,
          provider: data.provider ?? 'unknown',
          durationSeconds: duration,
          aspectRatio,
        })
      }
    } catch (e: any) {
      setError((e as Error).message ?? 'Network error')
      setStatus('error')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: DARK, color: '#fff', fontFamily: 'Inter, sans-serif' }}>
{/* Animated blob bg */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }} aria-hidden>
        <motion.div
          style={{ position: 'absolute', top: '-15%', left: '-8%', width: 600, height: 600, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(239,68,68,0.16) 0%, transparent 70%)', filter: 'blur(80px)' }}
          animate={{ x: [0, 40, 0], y: [0, -20, 0], scale: [1, 1.08, 1] }}
          transition={{ duration: 14, ease: 'easeInOut', repeat: Infinity }}
        />
        <motion.div
          style={{ position: 'absolute', bottom: '-10%', right: '-6%', width: 500, height: 500, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(220,38,38,0.10) 0%, transparent 70%)', filter: 'blur(90px)' }}
          animate={{ x: [0, -25, 0], y: [0, 20, 0], scale: [1, 1.06, 1] }}
          transition={{ duration: 18, ease: 'easeInOut', repeat: Infinity, delay: 2 }}
        />
      </div>
      {/* Navbar */}
      <nav style={{ borderBottom: `1px solid ${BORDER}`, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 900, fontSize: '1.2rem', letterSpacing: '-0.03em' }}>
            Clip<span style={{ color: ACCENT }}>Forge</span> AI
          </div>
          <div style={{ display: 'flex', gap: 20, fontSize: '0.85rem' }}>
            <Link href="/history" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>My Clips</Link>
            <Link href="/about" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>How It Works</Link>
          </div>
        </div>
      </nav>

      <main style={{ maxWidth: 760, margin: '0 auto', padding: '60px 24px 80px' }}>
        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: ACCENT, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>
            Free · No Signup · Open-Source AI
          </div>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.04em', marginBottom: 16 }}>
            Turn words into<br />
            <span style={{ color: ACCENT }}>AI video clips</span>
          </h1>
          <p style={{ fontSize: '1.05rem', color: 'rgba(255,255,255,0.5)', maxWidth: 480, margin: '0 auto' }}>
            {config.tagline}
          </p>
        </div>

        {/* Generator Card */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: '28px 24px', marginBottom: 32 }}>
          {/* Prompt textarea */}
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: 8, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Your idea
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the video you want to create..."
            rows={3}
            disabled={isLoading}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${prompt ? ACCENT + '60' : BORDER}`,
              borderRadius: 10, padding: '12px 14px',
              color: '#fff', fontSize: '0.97rem', lineHeight: 1.6,
              resize: 'vertical', outline: 'none',
              transition: 'border-color 0.2s',
              fontFamily: 'inherit',
            }}
            maxLength={500}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, marginBottom: 20 }}>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>{prompt.length}/500</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {EXAMPLE_PROMPTS.slice(0, 2).map((ex) => (
                <button
                  key={ex}
                  onClick={() => setPrompt(ex)}
                  style={{
                    background: 'rgba(249,115,22,0.12)', border: `1px solid ${ACCENT}40`,
                    borderRadius: 999, padding: '3px 10px',
                    color: ACCENT, fontSize: '0.72rem', cursor: 'pointer',
                  }}
                >
                  {ex.slice(0, 28)}…
                </button>
              ))}
            </div>
          </div>

          {/* Settings row */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
            {/* Duration */}
            <div style={{ flex: 1, minWidth: 140 }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Duration
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                {[3, 5, 8].filter(d => d <= config.maxDuration).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    style={{
                      flex: 1, padding: '8px 0', borderRadius: 8,
                      border: `1px solid ${duration === d ? ACCENT : BORDER}`,
                      background: duration === d ? ACCENT + '20' : 'transparent',
                      color: duration === d ? ACCENT : 'rgba(255,255,255,0.5)',
                      fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
                    }}
                  >
                    {d}s
                  </button>
                ))}
              </div>
            </div>

            {/* Aspect ratio */}
            <div style={{ flex: 2, minWidth: 200 }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Format
              </label>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: 8,
                  border: `1px solid ${BORDER}`, background: 'rgba(255,255,255,0.05)',
                  color: '#fff', fontSize: '0.88rem', cursor: 'pointer', outline: 'none',
                }}
              >
                {config.aspectRatios.map((ar) => (
                  <option key={ar.value} value={ar.value}>{ar.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={!prompt.trim() || isLoading}
            style={{
              width: '100%', padding: '14px 0',
              background: isLoading ? 'rgba(249,115,22,0.3)' : ACCENT,
              border: 'none', borderRadius: 10,
              color: '#fff', fontWeight: 800, fontSize: '1rem',
              cursor: isLoading || !prompt.trim() ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s', letterSpacing: '-0.01em',
            }}
          >
            {status === 'enhancing' && '✨ Enhancing your prompt…'}
            {status === 'generating' && '🎬 Generating video… (may take 60–120s)'}
            {(status === 'idle' || status === 'done' || status === 'error') && '🎬 Generate Video'}
          </button>

          <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)', marginTop: 12, marginBottom: 0 }}>
            Free · powered by open-source AI models · no account needed
          </p>
        </div>

        {/* Error */}
        {status === 'error' && error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '16px 20px', marginBottom: 24, color: '#fca5a5' }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Result */}
        {status === 'done' && videoUrl && (
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 24, marginBottom: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontWeight: 700, fontSize: '1rem', margin: 0 }}>Your Clip</h2>
              <span style={{ fontSize: '0.72rem', color: ACCENT, fontWeight: 600, background: ACCENT + '15', padding: '3px 10px', borderRadius: 999 }}>
                via {provider}
              </span>
            </div>

            <div style={{ borderRadius: 10, overflow: 'hidden', background: '#000', marginBottom: 16 }}>
              <video
                ref={videoRef}
                src={videoUrl}
                controls
                autoPlay
                loop
                style={{ width: '100%', maxHeight: 400, display: 'block' }}
              />
            </div>

            {enhancedPrompt && (
              <div style={{ background: 'rgba(249,115,22,0.06)', border: `1px solid ${ACCENT}25`, borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: ACCENT, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>AI-Enhanced Prompt</div>
                <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, margin: 0 }}>{enhancedPrompt}</p>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <a
                href={videoUrl}
                download="clipforge-clip.mp4"
                style={{
                  flex: 1, textAlign: 'center', padding: '10px 0',
                  background: ACCENT, borderRadius: 8,
                  color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: '0.88rem',
                }}
              >
                ↓ Download
              </a>
              <button
                onClick={() => { setStatus('idle'); setVideoUrl(null); setEnhancedPrompt(null) }}
                style={{
                  flex: 1, padding: '10px 0',
                  background: 'transparent', border: `1px solid ${BORDER}`,
                  borderRadius: 8, color: 'rgba(255,255,255,0.6)',
                  cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem',
                }}
              >
                Generate Another
              </button>
            </div>
          </div>
        )}

        {/* Example prompts */}
        <div>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            Try these prompts
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {EXAMPLE_PROMPTS.map((ex) => (
              <button
                key={ex}
                onClick={() => setPrompt(ex)}
                style={{
                  textAlign: 'left', padding: '12px 16px',
                  background: CARD, border: `1px solid ${BORDER}`,
                  borderRadius: 10, color: 'rgba(255,255,255,0.65)',
                  fontSize: '0.88rem', cursor: 'pointer', lineHeight: 1.5,
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = ACCENT + '50')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = BORDER)}
              >
                <span style={{ color: ACCENT, marginRight: 8 }}>→</span>{ex}
              </button>
            ))}
          </div>
        </div>
      </main>

      <footer style={{ borderTop: `1px solid ${BORDER}`, padding: '24px', textAlign: 'center', fontSize: '0.78rem', color: 'rgba(255,255,255,0.2)' }}>
        © {new Date().getFullYear()} ClipForge AI · Free AI video generation ·
        <Link href="/history" style={{ color: 'rgba(255,255,255,0.3)', marginLeft: 8, textDecoration: 'none' }}>My Clips</Link>
        <Link href="/about" style={{ color: 'rgba(255,255,255,0.3)', marginLeft: 8, textDecoration: 'none' }}>About</Link>
      </footer>
    </div>
  )
}
