# HANDOFF — clipforge-ai redesign: remove terminal green, new cyan video palette
**Date:** 2026-06-11  **Status:** IN PROGRESS
**Goal:** Remove dark/black/terminal-green patterns; apply slate-900 + cyan accent across all pages.

## Files to touch
- `app/globals.css` — update CSS vars from dark black to slate-900 + cyan
- `app/page.tsx` — new cyan palette, replace orange glows/accents
- `app/layout.tsx` — update body bg color
- `app/history/page.tsx` — replace DARK `#0a0a0f` with `#0f172a` slate-900
- `app/about/page.tsx` — replace DARK `#0a0a0f` with `#0f172a` slate-900
- `components/SegmentCard.tsx` — replace green-400 with cyan, fix dark glass
- `components/ClipPreview.tsx` — replace dark glass with slate/cyan theme

## Steps
- [x] Read all files (page.tsx, layout.tsx, globals.css, history, about, SegmentCard, ClipPreview)
- [ ] Update globals.css — new CSS vars (slate-900 bg, cyan accent)
- [ ] Update page.tsx — cyan palette, split layout preserved, DemoPanel cyan
- [ ] Update layout.tsx — body bg update
- [ ] Update history/page.tsx — replace `#0a0a0f` with `#0f172a`
- [ ] Update about/page.tsx — replace `#0a0a0f` with `#0f172a`
- [ ] Update SegmentCard.tsx — green-400 → cyan, dark glass → slate
- [ ] Update ClipPreview.tsx — dark glass → slate/cyan theme
- [ ] npm run build — fix until passes
- [ ] Git commit

## Success criteria
- No `#0a0a0f`, `#000`, `#080712` background anywhere
- No `green-400`, `green-500` score badge colors
- All pages use `#0f172a` (slate-900) bg + `#06b6d4` cyan accent
- `npm run build` passes

## Resume from here if interrupted
Starting globals.css update.

## Design lock (2026-10-06)
- Archetype: travel-magazine (hand-scored; kept existing split hero + live preview panel; varies from campaignforge/firstline/complybuddy)
- Accent #0f5f73 (deep teal; #06b6d4 collided with clawdbotai, #0ea5e9 with outreach-crm), bg #f8fafc light slate. Orange button/FAB and purple badge recoloured to accent.
- Logo: clapper/play mark in teal rounded square + "Clip" + accent "Forge" + "AI" (app/icon.svg, public/logo.svg); app/icon.tsx renamed .bak
- Theme: static CSS vars (no @vercel/edge-config dependency, no new deps so theme-loader not wired)
- Untracked non-mine: undefined/ dir at repo root of clipforge-ai

## Hub retrofit (2026-10-06)
- theme-loader uses fetch REST shim over EDGE_CONFIG (no new deps), cached 600s; data-layout on <html>; hub palette sets --bg/--accent. Build passes. Not visually verified (no screenshots).


## OWASP LLM Top 10 dispositions (gate item 45, 2026-10-07; list recalled from memory, unverified)
- LLM01 prompt injection: lib/guard.ts present, NOT yet wired into routes; no output filtering or tool sandbox review done. PARTIAL.
- LLM02 sensitive info disclosure: `redact()` helper available; not applied to every log. PARTIAL.
- LLM04/10 DoS / unbounded consumption: per-IP rate limit where present; token budgets not enforced. PARTIAL.
- LLM05 improper output handling: model output rendered as text; not audited for HTML sinks. UNVERIFIED.
- LLM06 excessive agency: no tool-calling agents audited. UNVERIFIED.
- Others (supply chain, poisoning, embeddings, misinformation): not assessed.


## ANIMATED SCOPE (gate items 19/21, derived from code 2026-10-07)
- Moves: AnimatedBg (ambient hero/background); CSS keyframes: blink, cfFadeUp, cfPulse, ds-float, ds-shift, fadeUp, float, pulseGlow; transitions on interactive elements.
- Trigger: page load (ambient) and hover/press (interactive). Reduced motion: honoured via prefers-reduced-motion block.
- STATUS: scope documented from existing code only. Skill-stack passes (ui-ux-pro-max, emil-design-eng, impeccable critique, review-animations) and 375/1280 screenshot review are NOT yet run for this app. Item 21 stays OPEN until they are.
