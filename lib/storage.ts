/**
 * lib/storage.ts — localStorage helpers for clip history
 * All clip history is stored client-side only (no DB needed for MVP)
 */

export interface ClipRecord {
  id: string
  prompt: string          // original user prompt
  enhancedPrompt: string  // AI-enhanced cinematic prompt
  videoUrl: string
  provider: string
  durationSeconds: number
  aspectRatio: string
  createdAt: string       // ISO timestamp
  thumbnail?: string      // optional base64 thumbnail
}

const KEY = 'clipforge_history'
const MAX_RECORDS = 20   // keep last 20 clips

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
    // storage full — drop oldest
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
