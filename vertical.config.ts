/**
 * vertical.config.ts — ClipForge AI
 * AI-powered text-to-video generator (free tier: Hugging Face Inference API)
 */

export interface ClipForgeConfig {
  id: string
  name: string
  tagline: string
  domain: string
  themeColor: string
  metaTitle: string
  metaDescription: string
  keywords: string[]
  aiSystemPrompt: string
  defaultDuration: number
  maxDuration: number
  aspectRatios: { label: string; value: string }[]
}

const config: ClipForgeConfig = {
  id: 'clipforge',
  name: 'ClipForge AI',
  tagline: 'Turn any idea into a short video clip — free, no account required',
  domain: 'clipforge.ai',
  themeColor: 'orange',

  metaTitle: 'ClipForge AI — Free Text-to-Video Generator',
  metaDescription: 'Generate short AI video clips from text in seconds. Free, no signup needed. Powered by open-source AI models.',
  keywords: ['ai video generator', 'text to video', 'free ai video', 'clip generator', 'ai clips'],

  aiSystemPrompt: `You are a cinematic prompt engineer for AI video generation.
Your job: take the user's rough idea and expand it into a vivid, detailed cinematic video prompt.
Rules:
- Output ONLY the enhanced prompt — no explanations, no preamble
- Be specific about camera movement (slow pan, dolly zoom, aerial shot, etc.)
- Include lighting, mood, color palette
- Keep it under 100 words
- Make it visually compelling and cinematically detailed`,

  defaultDuration: 5,
  maxDuration: 10,
  aspectRatios: [
    { label: '16:9 (Landscape)', value: '16:9' },
    { label: '9:16 (Portrait / Shorts)', value: '9:16' },
    { label: '1:1 (Square)', value: '1:1' },
  ],
}

export default config
