# ForkTheFuture — implementation gates

## F1 Scope & ingestion
- [x] Drag-and-drop PDF (10 MB / 40 pages), pasted text, curated sample
- [x] PDF.js extraction with page numbers; failures never crash the app
- [x] Text preview + page selection before analysis
- [x] No server-side URL fetching; Gemini privacy warning; attribution on every source
- [x] Constrained classification: robot-arm / battery-fade / queue-mm1 / unsupported
- [x] Gate: every upload yields an evidence-linked template or an explicit unsupported result (e2e)

## F2 Structured evidence
- [x] Zod `PaperAnalysis` schema (equations, variables, measurements, limitations, contradictions…)
- [x] Server-side source verification: page must be analysed, span must exist on page
- [x] Missing constants stay "Not provided"; manual correction of values; per-parameter provenance
- [x] One bounded Gemini call, char budget, user narrows pages
- [x] Gate: every simulation parameter shows the page + quote that justified it

## F3 Robot arm
- [x] True forward kinematics, degrees → radians, validation
- [x] Realistic SVG arm: links, joints, gripper, grid with metre ticks, reachable annulus, target, angle arcs, x/y drop-lines
- [x] Animation tweens joint angles (every frame is exact FK); reduced motion respected
- [x] Outputs, PNG export; unit tests for (0,0), (90°,0), invalid lengths

## F4 Battery fade
- [x] Geometric default, optional linear with prominent assumption note, temperature factor labelled assumption
- [x] Retention curve, 80% line, cycles-to-threshold, pinned baseline overlay
- [x] Tests: Q(0)=Q0, non-increasing, non-negative

## F5 Queue
- [x] M/M/1 only when λ < μ; unstable state otherwise
- [x] Latency vs λ, utilization meter, stability threshold, zones
- [x] Tests: λ=0, divergence, instability, hand calculation

## F6 Mapping workflow
- [x] Paper card, snippets, recommended template + rationale, confirm template and each parameter
- [x] Three-pane studio; parameter ↔ excerpt highlighting both ways
- [x] Model-mismatch banner ("Not an implementation of the paper's model")
- [x] Export PNG, scenario JSON (model/version/provenance), offline standalone HTML with attribution + limits

## F7 Surfaces
- [x] Landing hero with live arm, dropzone, three demo cards, no sign-in
- [x] Import result: editable metadata, badges, equation table with page links
- [x] Studio: dark, grid plot, keyboard-accessible sliders, unit/range/provenance/tooltip/reset/share/export
- [x] Compare A/B (pins: ghost arms, overlay curves, table)
- [x] Error states: protected, image-only, empty, unsupported, invalid units, quota, too large, too many pages

## F9 Showcase
- [x] Self-authored CC BY 4.0 golden fixtures
- [x] README with validity boundaries
- [x] 12+ unit tests (47) and e2e flagship flow (9)
- [x] Launch video via /brag (Hyperframes) — see brag-output/
- [ ] Live Gemini run verified with a real key (not possible from the build sandbox; see README)
