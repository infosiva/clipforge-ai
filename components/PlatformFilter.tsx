'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import type { ScoredSegment } from '@/lib/score'

const PLATFORMS = [
  { id: 'all', label: 'All', lengthGuide: null, color: '#f97316' },
  { id: 'tiktok', label: 'TikTok', lengthGuide: '15–60s', color: '#ee1d52' },
  { id: 'reels', label: 'Reels', lengthGuide: '15–90s', color: '#c13584' },
  { id: 'youtube-shorts', label: 'YouTube Shorts', lengthGuide: 'under 60s', color: '#ff0000' },
  { id: 'linkedin', label: 'LinkedIn', lengthGuide: '30–120s', color: '#0a66c2' },
] as const

type PlatformId = (typeof PLATFORMS)[number]['id']

// Map segment platform values to our filter IDs
const PLATFORM_ALIAS: Record<string, PlatformId> = {
  tiktok: 'tiktok',
  'youtube-shorts': 'youtube-shorts',
  reels: 'reels',
  linkedin: 'linkedin',
  all: 'all',
}

interface PlatformFilterProps {
  segments: ScoredSegment[]
  onFilter: (filtered: ScoredSegment[]) => void
}

export default function PlatformFilter({ segments, onFilter }: PlatformFilterProps) {
  const [active, setActive] = useState<PlatformId>('all')

  const handleSelect = (id: PlatformId) => {
    setActive(id)
    if (id === 'all') {
      onFilter(segments)
    } else {
      onFilter(segments.filter((s) => {
        const mapped = PLATFORM_ALIAS[s.platform] ?? 'all'
        return mapped === id || s.platform === 'all'
      }))
    }
  }

  const activePlatform = PLATFORMS.find((p) => p.id === active)!

  return (
    <div className="flex flex-col gap-2">
      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {PLATFORMS.map((p) => (
          <button
            key={p.id}
            onClick={() => handleSelect(p.id)}
            className="relative rounded-full border px-3 py-1 text-xs font-semibold transition-all duration-200"
            style={{
              borderColor: active === p.id ? `${p.color}60` : 'rgba(255,255,255,0.1)',
              background: active === p.id ? `${p.color}15` : 'transparent',
              color: active === p.id ? p.color : 'rgba(255,255,255,0.4)',
            }}
          >
            {p.label}
            {active === p.id && (
              <motion.span
                layoutId="platform-underline"
                className="absolute inset-x-0 -bottom-0.5 h-0.5 rounded-full"
                style={{ background: p.color }}
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Length guide pill */}
      {activePlatform.lengthGuide && (
        <motion.div
          key={active}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="flex items-center gap-1.5"
        >
          <span className="text-[10px] text-white/30">Best length for {activePlatform.label}:</span>
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{ background: `${activePlatform.color}18`, color: activePlatform.color }}
          >
            {activePlatform.lengthGuide}
          </span>
        </motion.div>
      )}
    </div>
  )
}
