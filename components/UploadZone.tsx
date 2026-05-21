'use client'

import { useCallback, useState } from 'react'

interface UploadZoneProps {
  onFile: (file: File) => void
  disabled?: boolean
}

export default function UploadZone({ onFile, disabled }: UploadZoneProps) {
  const [dragging, setDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleFile = useCallback(
    (file: File) => {
      setSelectedFile(file)
      onFile(file)
    },
    [onFile],
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      if (disabled) return
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [disabled, handleFile],
  )

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
    },
    [handleFile],
  )

  const formatSize = (bytes: number) =>
    bytes > 1024 * 1024
      ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
      : `${(bytes / 1024).toFixed(0)} KB`

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={[
        'relative flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-12 transition-all duration-200',
        dragging
          ? 'border-orange-400 bg-orange-500/10'
          : 'border-white/20 bg-white/[0.03] hover:border-white/40 hover:bg-white/[0.05]',
        disabled ? 'pointer-events-none opacity-50' : 'cursor-pointer',
      ].join(' ')}
    >
      <input
        type="file"
        accept="audio/*,video/mp4,video/webm"
        className="absolute inset-0 cursor-pointer opacity-0"
        onChange={onInputChange}
        disabled={disabled}
      />

      {selectedFile ? (
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="text-4xl">🎙️</div>
          <p className="font-medium text-white">{selectedFile.name}</p>
          <p className="text-sm text-white/50">{formatSize(selectedFile.size)}</p>
          <p className="text-sm text-orange-400">Processing…</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="text-5xl">🎧</div>
          <div>
            <p className="text-lg font-semibold text-white">Drop your podcast here</p>
            <p className="mt-1 text-sm text-white/50">
              MP3, MP4, M4A, WAV — up to 100 MB
            </p>
          </div>
          <span className="rounded-full border border-orange-500/50 px-4 py-1.5 text-sm text-orange-400">
            Browse files
          </span>
        </div>
      )}
    </div>
  )
}
