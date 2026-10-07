import { NextRequest } from 'next/server'
// Structured log sink: one JSON line per event to stdout (Vercel logs). Never throws, never 500.
export async function POST(req: NextRequest) {
  try {
    const raw = await req.text()
    if (raw.length > 2048) return new Response(null, { status: 204 })
    const b = JSON.parse(raw) as Record<string, unknown>
    const kind = b.kind === 'error' ? 'error' : 'usage'
    const line = { level: kind === 'error' ? 'error' : 'info', kind, name: String(b.name ?? '').slice(0, 60), message: String(b.message ?? '').slice(0, 300), stack: String(b.stack ?? '').slice(0, 800), path: String(b.path ?? '').slice(0, 120), ts: new Date().toISOString() }
    console.log(JSON.stringify(line))
  } catch {}
  return new Response(null, { status: 204 })
}
