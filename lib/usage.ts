import { Redis } from '@upstash/redis'
import config from '@/vertical.config'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// Hash IP+UA to a stable anonymous key — no PII stored
export function makeUserKey(ip: string, ua: string): string {
  let hash = 0
  const str = `${ip}|${ua}`
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return `anon_${Math.abs(hash).toString(36)}`
}

function usageKey(userKey: string): string {
  const d = new Date()
  const month = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
  return `clipforge:usage:${userKey}:${month}`
}

export async function checkUsage(userKey: string): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const count = await redis.get<number>(usageKey(userKey))
    const used = count ?? 0
    const remaining = Math.max(0, config.freeClipsPerMonth - used)
    return { allowed: remaining > 0, remaining }
  } catch (e) {
    // Fail open — don't block users if Redis is down
    console.error('[usage] checkUsage error:', e)
    return { allowed: true, remaining: config.freeClipsPerMonth }
  }
}

export async function incrementUsage(userKey: string): Promise<number> {
  try {
    const key = usageKey(userKey)
    const newCount = await redis.incr(key)
    // TTL: expire key 35 days after first write (covers full month + buffer)
    if (newCount === 1) {
      await redis.expire(key, 35 * 24 * 60 * 60)
    }
    return newCount
  } catch (e) {
    console.error('[usage] incrementUsage error:', e)
    return 0
  }
}
