'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

interface StatsData {
  clipsCreated: number
  hoursSaved: number
  platformsUsed: number
}

function readStats(): StatsData {
  try {
    const raw = localStorage.getItem('clipforge_stats')
    if (!raw) return { clipsCreated: 0, hoursSaved: 0, platformsUsed: 0 }
    return JSON.parse(raw) as StatsData
  } catch {
    return { clipsCreated: 0, hoursSaved: 0, platformsUsed: 0 }
  }
}

const PILLS = [
  { key: 'clipsCreated', label: 'clips created', icon: '✂️' },
  { key: 'hoursSaved', label: 'hours saved', icon: '⚡' },
  { key: 'platformsUsed', label: 'platforms used', icon: '📱' },
] as const

export default function ClipStats() {
  const [stats, setStats] = useState<StatsData | null>(null)

  useEffect(() => {
    setStats(readStats())
    // Listen for storage updates (other tabs or after generation)
    const handler = () => setStats(readStats())
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  // Don't render until mounted (avoids hydration mismatch)
  if (stats === null) return null

  const isEmpty = stats.clipsCreated === 0

  if (isEmpty) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut', delay: 0.4 }}
        className="mt-4 flex items-center gap-2 text-xs text-white/20"
      >
        <span
          className="rounded-full px-3 py-1 text-[11px]"
          style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.18)', color: 'rgba(139,92,246,0.6)' }}
        >
          0 clips yet — try your first
        </span>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut', delay: 0.4 }}
      className="mt-4 flex flex-wrap gap-2"
    >
      {PILLS.map(({ key, label, icon }, i) => (
        <motion.span
          key={key}
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2, delay: 0.45 + i * 0.06 }}
          className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold"
          style={{
            background: 'rgba(139,92,246,0.10)',
            border: '1px solid rgba(139,92,246,0.22)',
            color: '#a78bfa',
          }}
        >
          <span>{icon}</span>
          <span className="font-bold">{stats[key]}</span>
          <span style={{ color: 'rgba(167,139,250,0.65)' }}>{label}</span>
        </motion.span>
      ))}
    </motion.div>
  )
}
