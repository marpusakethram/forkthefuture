# Hyperframes Composition Brief: ForkTheFuture

## Objective
Create a short launch-style brag video for ForkTheFuture that a first-time viewer understands without thinking.

## Output
- Composition directory: `brag-output/composition/`
- Rendered video: `brag-output/brag.mp4`
- Format: landscape — 1920x1080, 30 fps
- Duration: 23.2 seconds

## Source Material
- Project root: repository root
- Primary files read: app/page.tsx, components/robot-arm.tsx, components/import-flow.tsx, components/studio.tsx,
  app/globals.css, fixtures/papers/two-link-arm-handout.pdf, README.md
- Product name: forkthefuture
- Tagline / strongest claim: "What if research papers were playable?"
- Key UI to recreate: dropzone, evidence table with "From paper, p. 2" chips, annotated robot arm studio
- Copy that must appear verbatim:
  - What if research papers were playable?
  - Our bench arm has L1 = 0.5 m and L2 = 0.3 m.
  - From paper, p. 2

## Creative Direction
- Tone preset: polished — crystal-clear product demo; labels explain, motion confirms
- Hook: hero line with a live arm beside it
- Outro: "Every number has a page number."
- Avoid: generic SaaS language, abstract filler, visualizer graphics, unreadably fast text

## Visual Identity
- Background: #ffffff / #15191e; Text: #1c2b33 / #e6ebf0; Accent: #0866ff; trace #6ea8ff; adjusted #e8a33d
- Font: Figtree Variable (bundled locally from @fontsource-variable/figtree)
- Arm drawing: same design language as components/robot-arm.tsx, positions computed with x = L1cosθ1 + L2cos(θ1+θ2)

## Storyboard
See brag-plan.md. Scenes: Hook 3.7s, Drop a PDF 5.26s, Receipts 4.74s, Play 5.79s, Outro 3.71s.

## Audio
- Music: assets/music/happy-beats-business-moves-vol-11-by-ende-dot-app.mp3, volume ~0.5, fade out last 1.2s
- Cue source: bundled preset (strong cues 3.70, 8.96, 17.91; beat grid for highlights 9.50/10.54/11.60/12.65)
- Audio-reactive: subtle glow on studio panel from bed energy if extraction available
- SFX (chosen after animation): interface/drop_002 (file drop), interface/click_003 (highlights), ui/switch2 (slider grab),
  impact/impactSoft_medium_001 (outro wordmark)

## Hyperframes Instructions
- Local GSAP (CDN blocked in this sandbox) at assets/vendor/gsap.min.js
- Run `npx hyperframes check` before render.
