import Link from 'next/link'

const ACCENT = '#f97316'
const DARK = '#0a0a0f'
const CARD = 'rgba(255,255,255,0.04)'
const BORDER = 'rgba(255,255,255,0.08)'

export default function AboutPage() {
  return (
    <div style={{ minHeight: '100vh', background: DARK, color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      <nav style={{ borderBottom: `1px solid ${BORDER}`, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/" style={{ fontWeight: 900, fontSize: '1.2rem', letterSpacing: '-0.03em', textDecoration: 'none', color: '#fff' }}>
            Clip<span style={{ color: ACCENT }}>Forge</span> AI
          </Link>
          <Link href="/" style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>← Generate</Link>
        </div>
      </nav>

      <main style={{ maxWidth: 640, margin: '0 auto', padding: '60px 24px 80px' }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 8 }}>How It Works</h1>
        <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.5)', marginBottom: 48 }}>Free, open-source AI video generation — no account, no credit card.</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 48 }}>
          {[
            { step: '1', title: 'Write your idea', body: 'Describe any scene, concept, or moment you want to see as a video. Keep it vivid — the more descriptive, the better.' },
            { step: '2', title: 'AI enhances your prompt', body: 'Our AI (Groq/Llama, completely free) rewrites your idea into a detailed cinematic prompt with camera movement, lighting, and mood.' },
            { step: '3', title: 'Video is generated', body: 'We send your enhanced prompt to open-source text-to-video models (Hugging Face Inference API — free, rate-limited). Your clip is ready in 60–120 seconds.' },
            { step: '4', title: 'Download & share', body: 'Your clip is saved to browser history. Download it, share it, or generate another — no limits on ideas.' },
          ].map(({ step, title, body }) => (
            <div key={step} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '20px 22px', display: 'flex', gap: 16 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: ACCENT, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.88rem', flexShrink: 0 }}>
                {step}
              </div>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>{title}</div>
                <div style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.7 }}>{body}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: 'rgba(249,115,22,0.06)', border: `1px solid ${ACCENT}25`, borderRadius: 12, padding: '20px 22px', marginBottom: 48 }}>
          <h2 style={{ fontWeight: 700, marginBottom: 12, fontSize: '1rem' }}>Models used</h2>
          <ul style={{ margin: 0, padding: '0 0 0 20px', fontSize: '0.88rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.9 }}>
            <li><strong style={{ color: '#fff' }}>Text AI</strong>: Llama 3.1 via Groq (free)</li>
            <li><strong style={{ color: '#fff' }}>Video (primary)</strong>: ali-vilab/text-to-video-ms-1.7b via Hugging Face (free)</li>
            <li><strong style={{ color: '#fff' }}>Video (fallback)</strong>: Wan 2.1 T2V via Replicate (optional, paid per run)</li>
          </ul>
        </div>

        <div style={{ textAlign: 'center' }}>
          <Link
            href="/"
            style={{
              display: 'inline-block', background: ACCENT, color: '#fff',
              textDecoration: 'none', padding: '14px 32px', borderRadius: 10,
              fontWeight: 800, fontSize: '1rem',
            }}
          >
            Start Generating →
          </Link>
        </div>
      </main>
    </div>
  )
}
