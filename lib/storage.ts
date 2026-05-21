/**
 * lib/storage.ts — localStorage clip history for podcast clipper
 */

export interface ClipRecord {
  id: string
  clipTitle: string
  hookLine: string
  videoUrl: string
  provider: string
  durationSeconds: number
  aspectRatio: string
  viralityScore: number
  transcriptText: string
  createdAt: string
}

const KEY = 'clipforge_podcast_history'
const MAX_RECORDS = 20

export function saveClip(clip: Omit<ClipRecord, 'id' | 'createdAt'>): ClipRecord {
  const record: ClipRecord = {
    ...clip,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  }
  const history = getHistory()
  history.unshift(record)
  if (history.length > MAX_RECORDS) history.splice(MAX_RECORDS)
  try {
    localStorage.setItem(KEY, JSON.stringify(history))
  } catch {
    history.pop()
    localStorage.setItem(KEY, JSON.stringify(history))
  }
  return record
}

export function getHistory(): ClipRecord[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    return JSON.parse(raw) as ClipRecord[]
  } catch {
    return []
  }
}

export function getClip(id: string): ClipRecord | null {
  return getHistory().find((c) => c.id === id) ?? null
}

export function deleteClip(id: string): void {
  const history = getHistory().filter((c) => c.id !== id)
  localStorage.setItem(KEY, JSON.stringify(history))
}

export function clearHistory(): void {
  localStorage.removeItem(KEY)
}
