'use client'

import type { ScoredSegment } from '@/lib/score'

interface SegmentCardProps {
  segment: ScoredSegment
  aspectRatio: string
  onGenerate: (segment: ScoredSegment) => void
  generating?: boolean
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80 ? 'text-green-700 border-green-500/50 bg-green-500/10' :
    score >= 60 ? 'text-orange-700 border-orange-500/50 bg-orange-500/10' :
                  'text-slate-500 border-slate-300 bg-slate-100'
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${color}`}>
      {score}
    </span>
  )
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function SegmentCard({ segment, aspectRatio, onGenerate, generating }: SegmentCardProps) {
  const platformLabels: Record<string, string> = {
    tiktok: 'TikTok',
    'youtube-shorts': 'YouTube Shorts',
    reels: 'Reels',
    all: 'All Platforms',
  }

  return (
    <div
      className="flex flex-col gap-3 rounded-2xl border p-5 transition-all"
      style={{ background: '#ffffff', borderColor: '#e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <ScoreBadge score={segment.viralityScore} />
            <span className="text-xs" style={{ color: '#94a3b8' }}>
              {platformLabels[segment.platform] ?? 'All Platforms'}
            </span>
            <span className="text-xs" style={{ color: '#94a3b8' }}>
              {formatTime(segment.start)} – {formatTime(segment.end)}
            </span>
          </div>
          <h3 className="font-semibold" style={{ color: '#0f172a' }}>{segment.clipTitle}</h3>
        </div>
      </div>

      <p className="text-sm font-medium italic text-orange-600">"{segment.hookLine}"</p>

      <p className="line-clamp-3 text-xs leading-relaxed" style={{ color: '#64748b' }}>
        {segment.text}
      </p>

      <button
        onClick={() => onGenerate(segment)}
        disabled={generating}
        className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {generating ? (
          <>
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Generating…
          </>
        ) : (
          <>Generate {aspectRatio} Clip</>
        )}
      </button>
    </div>
  )
}
