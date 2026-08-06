'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type FeedbackType = 'Bug' | 'Feature' | 'General'

export default function FeedbackWidget() {
  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [type, setType] = useState<FeedbackType>('General')
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const TYPES: FeedbackType[] = ['Bug', 'Feature', 'General']

  async function submit() {
    if (!message.trim() || message.trim().length < 5) {
      setError('Please enter at least a few words.')
      return
    }
    if (!rating) {
      setError('Please select a star rating.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type, rating, message, email,
          page: typeof window !== 'undefined' ? window.location.pathname : '/',
          site: 'ClipForge',
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError((d as { error?: string }).error ?? 'Something went wrong. Try again.')
      } else {
        setSubmitted(true)
        setTimeout(() => { setOpen(false); setSubmitted(false); setRating(0); setMessage(''); setEmail('') }, 2500)
      }
    } catch {
      setError('Network error — please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Toggle button — bottom-left to avoid overlap with chatbot */}
      <motion.button
        onClick={() => setOpen(o => !o)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.93 }}
        aria-label="Give feedback"
        title="Give feedback"
        style={{
          position: 'fixed', bottom: 24, left: 24, width: 44, height: 44,
          borderRadius: 12, background: '#fff', border: '1.5px solid rgba(249,115,22,0.25)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 12px rgba(249,115,22,0.10)', zIndex: 1000, fontSize: 18,
          transition: 'transform 160ms cubic-bezier(0.23,1,0.32,1)',
        }}
      >
        {open ? '✕' : '💬'}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
            style={{
              position: 'fixed', bottom: 80, left: 24, width: 300,
              background: '#fff', border: '1px solid rgba(249,115,22,0.15)',
              borderRadius: 16, zIndex: 1000, overflow: 'hidden',
              boxShadow: '0 8px 40px rgba(249,115,22,0.12)',
            }}
          >
            {/* Header */}
            <div style={{
              padding: '12px 16px', borderBottom: '1px solid #fff7ed',
              fontSize: 13, fontWeight: 700, color: '#1a1a2e',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f97316', display: 'inline-block' }} />
              Share feedback
            </div>

            {submitted ? (
              <div style={{ padding: 24, textAlign: 'center' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>🎉</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e', marginBottom: 4 }}>Thanks!</div>
                <div style={{ fontSize: 12, color: '#9a7764' }}>Your feedback helps improve ClipForge.</div>
              </div>
            ) : (
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Star rating */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#9a7764', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rating</div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[1, 2, 3, 4, 5].map(n => (
                      <button
                        key={n}
                        onClick={() => setRating(n)}
                        onMouseEnter={() => setHoverRating(n)}
                        onMouseLeave={() => setHoverRating(0)}
                        style={{
                          fontSize: 22, background: 'none', border: 'none', cursor: 'pointer', padding: 2,
                          color: n <= (hoverRating || rating) ? '#f97316' : '#e5e7eb',
                          transition: 'color 100ms ease, transform 100ms ease',
                          transform: n <= (hoverRating || rating) ? 'scale(1.15)' : 'scale(1)',
                        }}
                        aria-label={`Rate ${n} star${n > 1 ? 's' : ''}`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>

                {/* Type selector */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#9a7764', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Type</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {TYPES.map(t => (
                      <button
                        key={t}
                        onClick={() => setType(t)}
                        style={{
                          padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                          background: type === t ? 'rgba(249,115,22,0.1)' : '#f9fafb',
                          border: `1px solid ${type === t ? 'rgba(249,115,22,0.4)' : '#e5e7eb'}`,
                          color: type === t ? '#f97316' : '#6b7280',
                          transition: 'all 120ms ease',
                        }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#9a7764', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Message</div>
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="What's on your mind?"
                    rows={3}
                    style={{
                      width: '100%', background: '#fff7ed', border: '1px solid rgba(249,115,22,0.2)',
                      borderRadius: 8, padding: '8px 10px', fontSize: 12, color: '#1a1a2e',
                      outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit',
                    }}
                  />
                </div>

                {/* Optional email */}
                <div>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Email (optional — for follow-up)"
                    style={{
                      width: '100%', background: '#f9fafb', border: '1px solid #e5e7eb',
                      borderRadius: 8, padding: '7px 10px', fontSize: 12, color: '#1a1a2e',
                      outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
                    }}
                  />
                </div>

                {error && (
                  <div style={{ fontSize: 11, color: '#ef4444', background: '#fef2f2', borderRadius: 6, padding: '6px 10px' }}>
                    {error}
                  </div>
                )}

                <button
                  onClick={submit}
                  disabled={loading}
                  style={{
                    background: '#f97316', border: 'none', borderRadius: 8, padding: '9px 0',
                    fontSize: 13, fontWeight: 700, color: '#fff', cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.65 : 1, width: '100%',
                    transition: 'opacity 150ms ease, transform 100ms ease',
                  }}
                  onMouseDown={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.97)' }}
                  onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)' }}
                >
                  {loading ? 'Sending…' : 'Send feedback'}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
