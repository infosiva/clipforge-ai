import { NextRequest, NextResponse } from 'next/server'
import { API_LIMITER } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const limited = API_LIMITER.check(req)
  if (limited) return limited

  let body: { type: string; rating: number; message: string; email?: string; page?: string; site?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { type, rating, message, email, page, site } = body

  if (!message || message.trim().length < 5) {
    return NextResponse.json({ error: 'Message too short' }, { status: 400 })
  }
  if (!rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Invalid rating' }, { status: 400 })
  }

  const entry = {
    id: crypto.randomUUID(),
    site: site ?? 'ClipForge',
    type: type ?? 'General',
    rating,
    message: message.trim(),
    email: email?.trim() || null,
    page: page ?? '/',
    createdAt: new Date().toISOString(),
  }

  console.log('[feedback]', JSON.stringify(entry))

  const tok = process.env.TELEGRAM_BOT_TOKEN
  const cid = process.env.TELEGRAM_CHAT_ID
  if (tok && cid && process.env.TELEGRAM_NOTIFICATIONS_DISABLED !== 'true') {
    await fetch(`https://api.telegram.org/bot${tok}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: cid,
        text: `📣 Feedback — ${entry.site}\n${'⭐'.repeat(rating)} ${rating}/5\n\n${entry.message}`,
        parse_mode: 'Markdown',
      }),
    }).catch(() => {})
  }

  return NextResponse.json({ ok: true, id: entry.id })
}
