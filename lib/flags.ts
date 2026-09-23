/**
 * Feature flags -- reads toggle_<siteId>_* from Vercel Edge Config
 * Server-side only (Next.js Server Components / API routes)
 * Cached via unstable_cache (600s) -- never call Edge Config uncached (see section0-EDGE-CONFIG-QUOTA)
 */
import { unstable_cache } from 'next/cache'

export interface SiteFlags {
  auto_captions: boolean
  viral_predictor: boolean
  multi_platform: boolean
  chatbot: boolean
}

const DEFAULTS: SiteFlags = {
  auto_captions: true,
  viral_predictor: true,
  multi_platform: true,
  chatbot: true,
}

const FLAG_KEYS = Object.keys(DEFAULTS) as (keyof SiteFlags)[]

async function fetchSiteFlags(siteId: string): Promise<SiteFlags> {
  const connStr = process.env.EDGE_CONFIG
  if (!connStr) return { ...DEFAULTS }

  try {
    const keys = FLAG_KEYS.map((k) => `toggle_${siteId}_${k}`)
    const params = keys.map((k) => `key=${encodeURIComponent(k)}`).join('&')
    const url = connStr.replace(/\/+$/, '')
    const res = await fetch(`${url}/items?${params}`, {
      headers: { accept: 'application/json' },
    })

    if (!res.ok) return { ...DEFAULTS }

    const data = await res.json()
    const flags: SiteFlags = { ...DEFAULTS }

    if (Array.isArray(data.items)) {
      for (const item of data.items) {
        const m = (item.key as string).match(/^toggle_[a-z0-9-]+_([a-z_]+)$/)
        if (m && FLAG_KEYS.includes(m[1] as keyof SiteFlags)) {
          ;(flags as unknown as Record<string, boolean>)[m[1]] = Boolean(item.value)
        }
      }
    } else if (typeof data === 'object') {
      for (const k of FLAG_KEYS) {
        const edgeKey = `toggle_${siteId}_${k}`
        if (edgeKey in data) {
          ;(flags as unknown as Record<string, boolean>)[k] = Boolean(data[edgeKey])
        }
      }
    }

    return flags
  } catch {
    return { ...DEFAULTS }
  }
}

export async function getSiteFlags(siteId: string): Promise<SiteFlags> {
  const cached = unstable_cache(
    () => fetchSiteFlags(siteId),
    ['site-flags', siteId],
    { revalidate: 600 }
  )
  return cached()
}
