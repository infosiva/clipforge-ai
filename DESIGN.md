# DESIGN — ClipForge AI
Source of truth: `agents/design-system` (MASTER.md). This file is the project pointer.

- Accent: `#0f5f73` on bg `#f8fafc`
- Layout/palette/bg animation/GA4/flags: overridable by the hub via Edge Config `theme_clipforge` (loaded by `lib/theme-loader.ts`, applied in `app/layout.tsx`); hub values win over the defaults here.
- Background: `components/AnimatedBg.tsx` (hub `layout.bgAnimation`, reduced-motion safe, default `none` = unchanged look).
- Logo: `components/Logo.tsx` (used in the navbar/header); favicon is static `app/icon.svg` (no `app/icon.tsx`).

## AI platform (ai-core) status
Not on ai-core yet (honest gap): transcription/scoring use the local free chain. Media upload is not a text-RAG case; exempt until a retrieval feature exists.
