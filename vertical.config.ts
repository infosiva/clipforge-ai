export interface ClipForgeConfig {
  id: string
  name: string
  tagline: string
  domain: string
  themeColor: string
  freeClipsPerMonth: number
  maxAudioMb: number
  maxDurationSeconds: number
  aspectRatios: { label: string; value: string }[]
  aiSystemPrompt: string
  defaultDuration: number
  maxDuration: number
  keywords: string[]
}

const config: ClipForgeConfig = {
  id: 'clipforge',
  name: 'ClipForge AI',
  tagline: 'Turn any podcast into viral short clips — automatically',
  domain: 'clipforge.ai',
  themeColor: 'orange',
  freeClipsPerMonth: 2,
  maxAudioMb: 100, // ~1hr podcast at 128kbps ≈ 60MB; 100MB gives headroom for high-quality audio
  maxDurationSeconds: 3600,
  aspectRatios: [
    { label: '9:16 (TikTok/Shorts)', value: '9:16' },
    { label: '16:9 (YouTube)', value: '16:9' },
    { label: '1:1 (Instagram)', value: '1:1' },
  ],
  aiSystemPrompt:
    'You are a podcast virality expert. Identify the most engaging, shareable moments from podcast transcripts. Focus on: surprising insights, strong opinions, emotional peaks, actionable tips, and quotable one-liners. Output valid JSON only.',
  defaultDuration: 30,
  maxDuration: 60,
  keywords: [
    'podcast clip generator',
    'AI podcast clipper',
    'viral podcast clips',
    'podcast to short video',
    'podcast highlight reel',
    'auto clip podcast',
  ],
}

export default config
