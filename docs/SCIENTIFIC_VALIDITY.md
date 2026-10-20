# Scientific validity

ForkTheFuture is an **educational** tool. It evaluates three small, well-known equations with parameters you
can trace back to a page of a source document. It does **not** reproduce papers.

## What "mapped" means

1. Text is extracted from the pages you select (PDF.js, in your browser).
2. An extractor — Gemini if a key is configured, otherwise a deterministic rule-based extractor — proposes a
   template and candidate values. Every candidate must quote a text span.
3. The server checks that every quoted span really occurs on the cited page. Anything that fails is discarded
   and listed under "Discarded — evidence didn't check out".
4. You confirm the template and each value. Only confirmed values are labelled **From paper**.
   Values you change become **Adjusted** (the paper's value is kept alongside). Everything else is **Illustrative**.

Extracting an equation is not the same as reproducing a result. A paper's figures depend on its data, fitting
procedure, boundary conditions and many choices that a template does not capture.

## Template 1 — Two-link planar arm (forward kinematics)

x = L1 cos θ1 + L2 cos(θ1 + θ2), y = L1 sin θ1 + L2 sin(θ1 + θ2). Elbow at (L1 cos θ1, L1 sin θ1).

- Exact geometry for rigid links and revolute joints in a plane. θ2 is relative to link 1.
- No masses, torques, joint limits, compliance, backlash or dynamics.
- Reachable workspace: annulus |L1 − L2| ≤ r ≤ L1 + L2.
- Tests: (θ1, θ2) = (0, 0) → (L1 + L2, 0); (90°, 0) → (0, L1 + L2); a hand-calculated pose; invalid lengths rejected.

## Template 2 — Battery capacity fade (empirical)

Geometric: Q(n) = Q0 (1 − d)^n. Optional linear: Q(n) = max(0, Q0 − k n).

- A curve shape, not an electrochemical model. No SEI growth, lithium plating, calendar ageing or "knee".
- The temperature factor is an illustrative multiplier on the fade rate, **not** an Arrhenius law.
- If the source uses square-root, power-law, SEI or other nonlinear/mechanistic fade, the app shows
  "Not an implementation of the paper's model".
- Tests: Q(0) = Q0; non-increasing for d ≥ 0; never negative; cycles-to-80% matches ⌈ln 0.8 / ln(1 − d)⌉.

## Template 3 — M/M/1 queue

ρ = λ/μ, W = 1/(μ − λ), Wq = λ / (μ(μ − λ)), valid only for λ < μ.

- Poisson arrivals, exponential service, one FCFS server, infinite buffer, steady state.
- For λ ≥ μ the app reports **unstable** and never prints a finite waiting time.
- Real inference servers batch, have multiple workers and non-exponential service times. Those papers are
  flagged as mismatches (M/G/1, M/M/c, batching, priorities).
- Tests: λ = 0 → W = 1/μ, Wq = 0; λ = 9, μ = 12 → W = 1/3 s, Wq = 0.25 s, L = 3 (Little's law); divergence as λ → μ.

## What the AI is allowed to do

Gemini may only classify, summarise and quote. Its output is parsed with a strict Zod schema, size-bounded and
source-checked. No AI-generated code is ever executed — all maths lives in `lib/models/*.ts` and is unit tested.
