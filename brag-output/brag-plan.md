# Brag Plan: ForkTheFuture

## What is this app?
Drop in a research PDF and get a playable simulator whose every number links back to the exact sentence and page it came from.

## The angle
"Show, don't decorate." The user asked for visuals so clear that nobody has to think. So the film is a literal walkthrough of
the real product flow with on-screen labels doing the explaining: a real PDF page, real highlighted values ("L1 = 0.5 m", p. 2),
and the real annotated robot arm moving while its x/y numbers update from the actual forward-kinematics formula.

## Hook (first 2-3 seconds)
"What if research papers were playable?" — the product's own hero line, big, on the white Meta-like canvas, with the arm
already moving beside it so the answer is visible before it's said.

## Key moments (the middle)
- A PDF file card drops into the real dropzone; two page cards appear ("Reading 2 pages in your browser").
- The handout's worked-example sentence; four values get highlighted one after another and each flies into a parameter row
  that says "From paper, p. 2".
- The dark studio: realistic arm with angle arcs and x/y drop-lines. The elbow slider moves 45° → 100°. The arm, θ₂ label and
  the "Hand x / Hand y" readouts change in lockstep. The θ₂ chip flips from "From paper" to "Adjusted, paper: 45 deg".

## Outro / punchline
"Every number has a page number." + wordmark + "Three tested models. Honest about everything else."

## User flow worth showing
Drop PDF → confirm values with their page receipts → move a slider and watch the exact maths respond.

## Tone
- Preset: polished
- Creative direction: crystal-clear product demo; labels explain, motion confirms
- Interpretation: few scenes, long readable holds, smooth slides, no gimmicks; every on-screen element is product UI or a plain-English label.

## Format: landscape — 1920x1080
## Duration: 23.2s

## Visual identity (from the project)
- Background: #ffffff (landing) and #15191e (studio)
- Accent: #0866ff (Meta-like signal blue); trace #6ea8ff; adjusted #e8a33d
- Text: #1c2b33 on light, #e6ebf0 on dark
- Display + body font: Figtree (variable)
- Strongest visual element: the annotated robot arm (metal links, servo joints, gripper, θ arcs, x/y drop-lines)

## Share copy (draft)
Research papers, but playable: ForkTheFuture turns a PDF into a simulator where every number shows the page it came from.

## Audio direction
- Role: warm bed + sparse UI accents
- Music: happy-beats-business-moves-vol-11 (114.8 BPM)
- Music treatment: start at 0, bed at ~0.5, fade out over the final 1.2s
- Music cue guidance: preset `happy-beats-business-moves-vol-11...music-cues.md`. Strong cues to lock: 3.70s (scene 2 in),
  8.96s (scene 3 in), 17.91s (θ₂ reaches 100° / chip flips). Sequential highlights in scene 3 on every other beat
  (9.50, 10.54, 11.60, 12.65) so each label stays readable.
- Audio-reactive treatment: subtle; the studio arm panel's blue glow breathes with the bed. No visualizer graphics.
- SFX posture: sparse, motion-matched (drop on file landing, soft clicks on highlights, a slider tick, one soft impact on the outro).
- Restraint rule: no SFX on every animation; nothing louder than the music at the outro.

## Storyboard

### Scene 1 — Hook — 3.7s (0.00–3.70)
White canvas. "What if research papers were playable?" slides up line by line (left). Right: a small realistic arm already
waving gently (exact FK). Sequential/interaction: headline lines arrive in 3 quick steps, then hold ≥1.6s.
Audio intent: bed starts warm. Transition: soft slide → Scene 2

### Scene 2 — Drop a PDF — 5.26s (3.70–8.96)
Caption top-left: "1  Drop in a research PDF". The real dropzone (dashed rounded box). A cursor drags a PDF card
"two-link-arm-handout.pdf" in and drops it. Status: "Reading 2 pages in your browser…" → two page cards with real text.
Sequential/interaction: simulated drag-and-drop. Audio-coupled: drop sound on landing, click on page cards.
Transition: slide → Scene 3

### Scene 3 — Every number has a receipt — 4.74s (8.96–13.70)
Caption: "2  See where every number came from". Left: page 2 of the handout as a white paper sheet (real text).
Right: parameter table. Values L1 = 0.5 m, L2 = 0.3 m, theta1 = 30 deg, theta2 = 45 deg highlight one at a time and the matching
row lights up with "From paper, p. 2". Sequential: 4 items on every other beat, full set holds ~1s.
Audio-coupled: soft click per highlight. Transition: slide → Scene 4

### Scene 4 — Play with it — 5.79s (13.70–19.49)
Caption: "3  Move it. The maths moves with it." Dark studio: big annotated arm (θ arcs, L labels, x/y drop-lines),
right panel with Elbow angle slider and readouts "Hand x / Hand y". Slider eases 45° → 100° (lands 17.91s), arm and numbers
follow exactly; θ₂ chip flips to "Adjusted · paper: 45 deg". Audio-coupled: slider tick at start; soft accent at 17.91.
Transition: crossfade → Scene 5

### Scene 5 — Outro — 3.71s (19.49–23.20)
White. "Every number has a page number." then the forkthefuture wordmark and "Three tested models. Honest about everything else."
Audio: soft impact on wordmark (20.02), music fades.

**Music mood for this video:** upbeat, clean
**Audio summary:** a warm bed carries a calm, clear walkthrough with a few tactile UI sounds and one soft payoff.
