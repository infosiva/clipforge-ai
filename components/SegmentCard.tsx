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
    score >= 80 ? 'text-green-400 border-green-500/50 bg-green-500/10' :
    score >= 60 ? 'text-orange-400 border-orange-500/50 bg-orange-500/10' :
                  'text-white/50 border-white/20 bg-white/[0.03]'
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
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/[0.05]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <ScoreBadge score={segment.viralityScore} />
            <span className="text-xs text-white/40">
              {platformLabels[segment.platform] ?? 'All Platforms'}
            </span>
            <span className="text-xs text-white/30">
              {formatTime(segment.start)} – {formatTime(segment.end)}
            </span>
          </div>
          <h3 className="font-semibold text-white">{segment.clipTitle}</h3>
        </div>
      </div>

      <p className="text-sm font-medium italic text-orange-300/90">"{segment.hookLine}"</p>

      <p className="line-clamp-3 text-xs leading-relaxed text-white/40">
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
