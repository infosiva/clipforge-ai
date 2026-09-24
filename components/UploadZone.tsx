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
      style={{ background: dragging ? 'rgba(249,115,22,0.06)' : '#f8fafc' }}
      className={[
        'relative flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-12 transition-all duration-200',
        dragging
          ? 'border-orange-400'
          : 'border-slate-300 hover:border-slate-400',
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
          <p className="font-medium" style={{ color: '#0f172a' }}>{selectedFile.name}</p>
          <p className="text-sm" style={{ color: '#64748b' }}>{formatSize(selectedFile.size)}</p>
          <p className="text-sm text-orange-500">Processing…</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="text-5xl">🎧</div>
          <div>
            <p className="text-lg font-semibold" style={{ color: '#0f172a' }}>Drop your podcast here</p>
            <p className="mt-1 text-sm" style={{ color: '#64748b' }}>
              MP3, MP4, M4A, WAV — up to 100 MB
            </p>
          </div>
          <span className="rounded-full border border-orange-400 px-4 py-1.5 text-sm text-orange-500">
            Browse files
          </span>
        </div>
      )}
    </div>
  )
}
