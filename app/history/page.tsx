'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getHistory, deleteClip, clearHistory, type ClipRecord } from '@/lib/storage'

const ACCENT = '#f97316'
const DARK = '#0a0a0f'
const CARD = 'rgba(255,255,255,0.04)'
const BORDER = 'rgba(255,255,255,0.08)'

export default function HistoryPage() {
  const [clips, setClips] = useState<ClipRecord[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setClips(getHistory())
  }, [])

  function handleDelete(id: string) {
    deleteClip(id)
    setClips(getHistory())
  }

  function handleClear() {
    if (confirm('Delete all clip history?')) {
      clearHistory()
      setClips([])
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: DARK, color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      {/* Navbar */}
      <nav style={{ borderBottom: `1px solid ${BORDER}`, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/" style={{ fontWeight: 900, fontSize: '1.2rem', letterSpacing: '-0.03em', textDecoration: 'none', color: '#fff' }}>
            Clip<span style={{ color: ACCENT }}>Forge</span> AI
          </Link>
          <Link href="/" style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>← Generate</Link>
        </div>
      </nav>

      <main style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px 80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 4 }}>My Clips</h1>
            <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', margin: 0 }}>Stored locally in your browser</p>
          </div>
          {clips.length > 0 && (
            <button
              onClick={handleClear}
              style={{
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 8, padding: '8px 16px', color: '#fca5a5',
                fontSize: '0.82rem', cursor: 'pointer', fontWeight: 600,
              }}
            >
              Clear All
            </button>
          )}
        </div>

        {!mounted && (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: '60px 0' }}>Loading…</div>
        )}

        {mounted && clips.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>🎬</div>
            <p style={{ color: 'rgba(255,255,255,0.4)', marginBottom: 24 }}>No clips yet. Generate your first one!</p>
            <Link
              href="/"
              style={{
                display: 'inline-block', background: ACCENT, color: '#fff',
                textDecoration: 'none', padding: '12px 28px', borderRadius: 10,
                fontWeight: 700, fontSize: '0.95rem',
              }}
            >
              Generate a Clip →
            </Link>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {clips.map((clip) => (
            <div
              key={clip.id}
              style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: 'hidden' }}
            >
              {/* Video */}
              <video
                src={clip.videoUrl}
                controls
                loop
                style={{ width: '100%', maxHeight: 300, background: '#000', display: 'block' }}
              />

              <div style={{ padding: '16px 20px' }}>
                {/* Prompt */}
                <p style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.8)', lineHeight: 1.6, margin: '0 0 10px' }}>
                  {clip.prompt}
                </p>

                {/* Meta */}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
                  <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.06)', padding: '3px 8px', borderRadius: 999 }}>
                    {clip.durationSeconds}s
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.06)', padding: '3px 8px', borderRadius: 999 }}>
                    {clip.aspectRatio}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: ACCENT, background: ACCENT + '15', padding: '3px 8px', borderRadius: 999 }}>
                    {clip.provider}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.25)', marginLeft: 'auto' }}>
                    {new Date(clip.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <a
                    href={clip.videoUrl}
                    download={`clipforge-${clip.id.slice(0, 8)}.mp4`}
                    style={{
                      flex: 1, textAlign: 'center', padding: '8px 0',
                      background: ACCENT, borderRadius: 8,
                      color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: '0.82rem',
                    }}
                  >
                    ↓ Download
                  </a>
                  <button
                    onClick={() => handleDelete(clip.id)}
                    style={{
                      padding: '8px 16px',
                      background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                      borderRadius: 8, color: '#fca5a5',
                      cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600,
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
