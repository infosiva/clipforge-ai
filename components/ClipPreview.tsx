'use client'

import { useState } from 'react'

interface ClipPreviewProps {
  videoUrl: string
  hookLine: string
  clipTitle: string
  provider: string
  aspectRatio: string
  onAspectRatioChange?: (ar: '9:16' | '16:9' | '1:1') => void
  onBack: () => void
}

const ASPECT_RATIOS = [
  { value: '9:16' as const, label: '9:16', desc: 'TikTok/Shorts' },
  { value: '16:9' as const, label: '16:9', desc: 'YouTube' },
  { value: '1:1' as const, label: '1:1', desc: 'Instagram' },
]

// Map aspect ratio to Tailwind padding-top for aspect-ratio box trick
const AR_PADDING: Record<string, string> = {
  '9:16': 'pb-[177.78%]',
  '16:9': 'pb-[56.25%]',
  '1:1': 'pb-[100%]',
}

export default function ClipPreview({
  videoUrl,
  hookLine,
  clipTitle,
  provider,
  aspectRatio,
  onAspectRatioChange,
  onBack,
}: ClipPreviewProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(hookLine)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const padding = AR_PADDING[aspectRatio] ?? AR_PADDING['16:9']

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-white/60 transition hover:bg-white/10 hover:text-white"
        >
          ← Back to clips
        </button>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-white">{clipTitle}</h2>
          <span className="rounded-full border border-white/10 px-2.5 py-0.5 text-xs text-white/40">
            via {provider}
          </span>
        </div>

        {/* Aspect ratio toggle */}
        <div className="flex gap-2">
          {ASPECT_RATIOS.map((ar) => (
            <button
              key={ar.value}
              onClick={() => onAspectRatioChange?.(ar.value)}
              className={[
                'flex flex-col items-center rounded-xl border px-3 py-2 text-xs transition',
                aspectRatio === ar.value
                  ? 'border-orange-500/70 bg-orange-500/15 text-orange-300'
                  : 'border-white/10 bg-white/[0.03] text-white/40 hover:border-white/20 hover:text-white/70',
              ].join(' ')}
            >
              <span className="font-semibold">{ar.label}</span>
              <span className="text-[10px]">{ar.desc}</span>
            </button>
          ))}
        </div>

        {/* Video player — aspect-ratio box */}
        <div className={`relative w-full ${padding}`}>
          <video
            src={videoUrl}
            controls
            playsInline
            className="absolute inset-0 h-full w-full rounded-xl object-cover"
          />
        </div>

        {/* Hook line */}
        <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-3">
          <p className="text-sm font-medium italic text-orange-300">"{hookLine}"</p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <a
            href={videoUrl}
            download
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-400"
          >
            ↓ Download
          </a>
          <button
            onClick={handleCopy}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/20 px-4 py-2.5 text-sm text-white/70 transition hover:border-white/40 hover:text-white"
          >
            {copied ? '✓ Copied!' : 'Copy Caption'}
          </button>
        </div>
      </div>
    </div>
  )
}
