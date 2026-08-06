'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function FloatingChatWrapper() {
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<{ role: 'user' | 'bot'; text: string }[]>([
    { role: 'bot', text: "Hi! I'm ClipBot. Ask me about video clipping, editing tips, or how to use ClipForge AI." },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  async function send() {
    if (!input.trim() || loading) return
    const userMsg = input
    setMsgs(m => [...m, { role: 'user', text: userMsg }])
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: userMsg }] }),
      })
      const data = await res.json()
      setMsgs(m => [...m, { role: 'bot', text: data.reply || data.text || 'Happy to help with your clips!' }])
    } catch {
      setMsgs(m => [...m, { role: 'bot', text: 'Try again in a moment!' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <motion.button
        onClick={() => setOpen(o => !o)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.93 }}
        aria-label="Open ClipBot chat"
        style={{
          position: 'fixed', bottom: 24, right: 24, width: 52, height: 52,
          borderRadius: '50%', background: 'linear-gradient(135deg,#f97316,#ea580c)',
          border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
          justifyContent: 'center', boxShadow: '0 4px 20px rgba(249,115,22,0.35)',
          zIndex: 1000, fontSize: 20,
          transition: 'transform 160ms cubic-bezier(0.23,1,0.32,1)',
        }}
      >
        {open ? '✕' : '🎬'}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
            style={{
              position: 'fixed', bottom: 88, right: 24, width: 320, height: 420,
              background: '#fff', border: '1px solid rgba(249,115,22,0.15)',
              borderRadius: 16, display: 'flex', flexDirection: 'column',
              zIndex: 1000, overflow: 'hidden', boxShadow: '0 8px 40px rgba(249,115,22,0.12)',
            }}
          >
            {/* Header */}
            <div style={{
              padding: '12px 16px', borderBottom: '1px solid #fff7ed',
              fontSize: 13, fontWeight: 700, color: '#1a1a2e',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f97316', display: 'inline-block' }} />
              ClipBot
            </div>

            {/* Messages */}
            <div style={{
              flex: 1, overflowY: 'auto', padding: '12px 16px',
              display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              {msgs.map((m, i) => (
                <div
                  key={i}
                  style={{
                    alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                    background: m.role === 'user' ? '#f97316' : '#fff7ed',
                    color: m.role === 'user' ? '#fff' : '#1a1a2e',
                    padding: '8px 12px', borderRadius: 10,
                    fontSize: 12.5, maxWidth: '85%', lineHeight: 1.5,
                  }}
                >
                  {m.text}
                </div>
              ))}
              {loading && (
                <div style={{
                  alignSelf: 'flex-start', background: '#fff7ed',
                  padding: '8px 12px', borderRadius: 10, fontSize: 12, color: '#fdba74',
                }}>
                  …
                </div>
              )}
            </div>

            {/* Input */}
            <div style={{ padding: '10px 12px', borderTop: '1px solid #fff7ed', display: 'flex', gap: 8 }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && send()}
                placeholder="Ask about clipping, editing…"
                style={{
                  flex: 1, background: '#fff7ed', border: '1px solid rgba(249,115,22,0.2)',
                  borderRadius: 8, padding: '7px 10px', fontSize: 12, color: '#1a1a2e', outline: 'none',
                }}
              />
              <button
                onClick={send}
                disabled={loading}
                style={{
                  background: '#f97316', border: 'none', borderRadius: 8,
                  padding: '7px 13px', fontSize: 13, color: '#fff',
                  cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 700,
                  opacity: loading ? 0.6 : 1,
                  transition: 'opacity 150ms ease',
                }}
              >
                →
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
