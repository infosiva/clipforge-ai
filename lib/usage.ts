import { supabaseAdmin } from '@/lib/supabase'
import config from '@/vertical.config'

// Hash IP+UA to a stable anonymous key — no PII stored
export function makeUserKey(ip: string, ua: string): string {
  let hash = 0
  const str = `${ip}|${ua}`
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return `anon_${Math.abs(hash).toString(36)}`
}

function currentMonth(): string {
  const d = new Date()
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

export async function checkUsage(userKey: string): Promise<{ allowed: boolean; remaining: number }> {
  const month = currentMonth()

  const { data, error } = await supabaseAdmin
    .from('clip_usage')
    .select('clip_count')
    .eq('user_key', userKey)
    .eq('month', month)
    .maybeSingle()

  if (error) {
    // Fail open — don't block users if DB is down
    console.error('[usage] checkUsage error:', error.message)
    return { allowed: true, remaining: config.freeClipsPerMonth }
  }

  const used = data?.clip_count ?? 0
  const remaining = Math.max(0, config.freeClipsPerMonth - used)
  return { allowed: remaining > 0, remaining }
}

export async function incrementUsage(userKey: string): Promise<number> {
  const month = currentMonth()

  const { data, error } = await supabaseAdmin.rpc('increment_clip_count', {
    p_user_key: userKey,
    p_month: month,
  })

  if (error) {
    console.error('[usage] incrementUsage error:', error.message)
    return 0
  }

  return data as number
}

export interface ClipRecord {
  user_key: string
  clip_title: string
  hook_line: string
  transcript_text: string
  video_url: string
  provider: string
  duration_seconds: number
  aspect_ratio: string
  virality_score: number
}

export async function saveClipToDb(record: ClipRecord): Promise<void> {
  const { error } = await supabaseAdmin.from('clips').insert(record)
  if (error) {
    // Non-fatal — clip was generated, just not saved to history
    console.error('[usage] saveClipToDb error:', error.message)
  }
}
