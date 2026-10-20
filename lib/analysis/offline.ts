// Deterministic, rule-based extractor used when no Gemini key is configured (or quota is hit).
// It only ever quotes text that exists in the supplied pages; it never invents values.

import type { Equation, Measurement, PaperAnalysis, SourcePage, Variable } from "@/lib/ai/extract-schema";
import { TEMPLATES, TEMPLATE_IDS, type TemplateId, type CandidateTemplate } from "@/lib/models/templates";
import { toCanonical, UnitError, type Dimension } from "@/lib/models/units";

const NUM = String.raw`(-?\d+(?:\.\d+)?(?:[eE]-?\d+)?)`;
const UNIT = String.raw`(mAh|Ah|mm|cm|m|°|deg(?:rees)?|rad(?:ians)?|%|requests?\s*(?:/|per)\s*(?:second|minute|hour|min|s|h)|req/s|/s|/min|/h|per\s+(?:second|minute|hour)|cycles?)?`;

/** Symbol spellings (as they appear in text) for each template parameter. */
const SYMBOLS: Record<string, string[]> = {
  L1: ["L1", "L_1", "L₁", "ℓ1"],
  L2: ["L2", "L_2", "L₂", "ℓ2"],
  theta1: ["θ1", "θ_1", "θ₁", "theta1", "theta_1"],
  theta2: ["θ2", "θ_2", "θ₂", "theta2", "theta_2"],
  targetX: ["x_t", "xt", "x_target"],
  targetY: ["y_t", "yt", "y_target"],
  Q0: ["Q0", "Q_0", "Q₀"],
  d: ["d"],
  k: ["k"],
  lambda: ["λ", "lambda"],
  mu: ["μ", "µ", "mu"],
};

/** Phrases that introduce a parameter value in prose, e.g. "an arrival rate of 8 requests per second". */
const PHRASES: Record<string, string[]> = {
  L1: ["first link length", "link 1 length", "upper arm length", "shoulder link length"],
  L2: ["second link length", "link 2 length", "forearm length"],
  theta1: ["shoulder angle"],
  theta2: ["elbow angle"],
  Q0: ["initial capacity", "nominal capacity", "rated capacity"],
  d: ["fade rate", "fade per cycle", "capacity loss per cycle", "per-cycle fade"],
  nMax: ["cycled for", "tested for", "over"],
  lambda: ["arrival rate", "request rate", "arrivals at"],
  mu: ["service rate", "processing rate", "serves", "completes"],
};

const DIM_UNIT_DEFAULT: Partial<Record<Dimension, string>> = { angle: "deg" };

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function classify(pages: SourcePage[]): { template: CandidateTemplate; confidence: number; rationale: string; scores: Record<TemplateId, number> } {
  const text = pages.map((p) => p.text).join("\n").toLowerCase();
  const scores = {} as Record<TemplateId, number>;
  const hitsBy = {} as Record<TemplateId, string[]>;
  for (const id of TEMPLATE_IDS) {
    const hits: string[] = [];
    let score = 0;
    for (const kw of TEMPLATES[id].keywords) {
      const re = new RegExp(`(^|[^a-z])${escapeRe(kw)}([^a-z]|$)`, "g");
      const n = (text.match(re) ?? []).length;
      if (n > 0) {
        hits.push(kw);
        score += Math.min(n, 4);
      }
    }
    scores[id] = score;
    hitsBy[id] = hits;
  }
  const ranked = [...TEMPLATE_IDS].sort((a, b) => scores[b] - scores[a]);
  const best = ranked[0];
  const second = scores[ranked[1]];
  if (scores[best] < 4 || hitsBy[best].length < 2) {
    return { template: "unsupported", confidence: 0, scores, rationale: "No supported template's vocabulary appears often enough in the selected pages." };
  }
  const margin = (scores[best] - second) / scores[best];
  const confidence = Math.round(Math.min(0.85, 0.35 + 0.05 * hitsBy[best].length + 0.3 * margin) * 100) / 100;
  return {
    template: best,
    confidence,
    scores,
    rationale: `Rule-based match on terms: ${hitsBy[best].slice(0, 6).join(", ")}.`,
  };
}

function toLatex(s: string): string {
  return s
    .replace(/\btheta_?(\d)\b/g, "θ$1")
    .replace(/\btheta\b/g, "θ")
    .replace(/\blambda\b/g, "λ")
    .replace(/\bmu\b/g, "μ")
    .replace(/\brho\b/g, "ρ")
    .replace(/θ_?([12₁₂])/g, (_, d) => `\\theta_${d === "₁" ? 1 : d === "₂" ? 2 : d}`)
    .replace(/θ/g, "\\theta ")
    .replace(/λ/g, "\\lambda ")
    .replace(/[μµ]/g, "\\mu ")
    .replace(/ρ/g, "\\rho ")
    .replace(/×|·/g, "\\cdot ")
    .replace(/−/g, "-")
    .replace(/\b(cos|sin|tan|log|ln|exp)\b/g, "\\$1")
    .replace(/\b([LQWxy])_?([0-9q])\b/g, "$1_{$2}")
    .replace(/\^\s*\(([^)]*)\)/g, "^{$1}")
    .replace(/\^(\w+)/g, "^{$1}");
}

const MATHY = /cos|sin|θ|λ|μ|ρ|\^|\/|×|√|\(|\)|\+|−|-/;

function findEquations(pages: SourcePage[]): Equation[] {
  const out: Equation[] = [];
  for (const p of pages) {
    const lines = p.text.split(/\n+/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.length < 5 || line.length > 160 || !line.includes("=")) continue;
      // Skip plain assignments like "L1 = 0.5 m" — those are parameter values, not equations.
      if (new RegExp(`^[^=]{1,12}=\\s*${NUM}\\s*\\S{0,12}[.,;]?$`).test(line)) continue;
      const [lhs, rhs] = line.split("=", 2);
      if (!rhs || !/[A-Za-zθλμρ]/.test(lhs) || !MATHY.test(rhs)) continue;
      // Equations are usually short and symbol-dense; skip prose sentences with an equals sign.
      if (line.split(/\s+/).filter((w) => /^[a-z]{4,}$/.test(w)).length > 3) continue;
      const eqText = line.replace(/\s*\(\d+\)\s*$/, "").trim();
      const context = (lines[i - 1] ?? "").trim().slice(0, 300);
      out.push({
        latex_string: toLatex(eqText),
        context,
        source_page: p.page,
        text_span: eqText,
        units: null,
        extracted_vs_inferred: "extracted",
      });
      if (out.length >= 20) return out;
    }
  }
  return out;
}

interface Hit {
  key: string;
  value: number;
  rawValue: number;
  unit: string | null;
  page: number;
  span: string;
  symbol: string;
}

function canonicalize(template: TemplateId, key: string, value: number, unit: string | null): number | null {
  const def = TEMPLATES[template].params.find((p) => p.key === key);
  if (!def) return null;
  let u = unit?.trim() ?? "";
  if (!u) u = DIM_UNIT_DEFAULT[def.dimension] ?? (def.dimension === "rate" ? "/s" : def.dimension === "length" ? "m" : def.dimension === "capacity" ? "Ah" : "");
  u = u.replace(/^°$/, "deg").replace(/^degrees$/, "deg").replace(/^radians$/, "rad").replace(/^cycles?$/, "");
  u = u.replace(/^requests?\s*(?:\/|per)\s*(s|second)$/i, "/s").replace(/^requests?\s*(?:\/|per)\s*(min|minute)$/i, "/min").replace(/^requests?\s*(?:\/|per)\s*(h|hour)$/i, "/h");
  u = u.replace(/^per\s+second$/i, "/s").replace(/^per\s+minute$/i, "/min").replace(/^per\s+hour$/i, "/h").replace(/^req\/s$/i, "/s");
  try {
    return toCanonical(value, u, def.dimension);
  } catch (e) {
    if (e instanceof UnitError) return null;
    throw e;
  }
}

function findValues(template: TemplateId, pages: SourcePage[]): Hit[] {
  const hits: Hit[] = [];
  const keys = TEMPLATES[template].params.map((p) => p.key);
  for (const p of pages) {
    for (const key of keys) {
      for (const sym of SYMBOLS[key] ?? []) {
        // Single-letter symbols (d, k) need an explicit "=" and a word boundary to avoid noise.
        const re = new RegExp(`(?<![\\w])${escapeRe(sym)}\\s*=\\s*${NUM}\\s*${UNIT}`, "g");
        for (const m of p.text.matchAll(re)) {
          const raw = Number(m[1]);
          const v = canonicalize(template, key, raw, m[2] ?? null);
          if (v !== null) hits.push({ key, value: v, rawValue: raw, unit: m[2] ?? null, page: p.page, span: m[0].trim(), symbol: sym });
        }
      }
      for (const phrase of PHRASES[key] ?? []) {
        const re = new RegExp(`${escapeRe(phrase).replace(/ /g, "\\s+")}\\s*(?:of|is|=|:|at)?\\s*(?:about|approximately|~)?\\s*${NUM}\\s*${UNIT}`, "gi");
        for (const m of p.text.matchAll(re)) {
          if (key === "nMax" && !/cycle/i.test(m[2] ?? "")) continue;
          const raw = Number(m[1]);
          const v = canonicalize(template, key, raw, m[2] ?? null);
          if (v !== null) hits.push({ key, value: v, rawValue: raw, unit: m[2] ?? null, page: p.page, span: m[0].trim(), symbol: phrase });
        }
      }
    }
  }
  return hits;
}

function findMeasurements(pages: SourcePage[]): Measurement[] {
  const out: Measurement[] = [];
  const re = new RegExp(`[^.\\n]{0,80}?${NUM}\\s*(%|ms|s|Ah|mAh|requests? per second|req/s)\\b[^.\\n]{0,60}`, "g");
  for (const p of pages) {
    for (const m of p.text.matchAll(re)) {
      if (!/(measured|observed|retain|retention|latency|after|reached|recorded)/i.test(m[0])) continue;
      out.push({ description: m[0].trim().slice(0, 190), value: Number(m[1]), unit: m[2], source_page: p.page, text_span: m[0].trim() });
      if (out.length >= 10) return out;
    }
  }
  return out;
}

function findSentences(pages: SourcePage[], re: RegExp, max: number): string[] {
  const out: string[] = [];
  for (const p of pages) {
    // Drop heading-like lines (titles, author and date lines) so they don't fuse into the first sentence.
    const prose = p.text
      .split("\n")
      .filter((l) => /[.!?:,;]\s*$/.test(l.trim()) || l.trim().split(/\s+/).length >= 8)
      .join(" ");
    for (const s of prose.split(/(?<=[.!?])\s+/)) {
      if (re.test(s) && s.length < 300) out.push(`${s.trim()} (p. ${p.page})`);
      if (out.length >= max) return out;
    }
  }
  return out;
}

function firstLine(pages: SourcePage[]): string {
  const line = pages[0]?.text.split("\n").map((l) => l.trim()).find((l) => l.length > 3) ?? "Untitled source";
  return line.slice(0, 200);
}

export function analyzeOffline(pages: SourcePage[], titleHint?: string): PaperAnalysis {
  const cls = classify(pages);
  const title = titleHint?.trim() || firstLine(pages);
  const allText = pages.map((p) => p.text).join("\n");
  const authorLine = allText.match(/^(?:authors?|by)\s*[:\-]?\s*(.+)$/im)?.[1];
  const date = allText.match(/\b((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(?:\d{1,2},\s*)?(?:19|20)\d{2}|(?:19|20)\d{2}-\d{2}-\d{2})\b/i)?.[1] ?? null;

  const variables: Variable[] = [];
  const contradictions: string[] = [];
  if (cls.template !== "unsupported") {
    const hits = findValues(cls.template, pages);
    const seen = new Map<string, Hit>();
    for (const h of hits) {
      const prev = seen.get(h.key);
      if (!prev) {
        seen.set(h.key, h);
        continue;
      }
      if (Math.abs(prev.value - h.value) > 1e-9 * Math.max(1, Math.abs(prev.value))) {
        contradictions.push(`${h.key} is stated as "${prev.span}" (p. ${prev.page}) and as "${h.span}" (p. ${h.page}). The first value was kept.`);
      }
    }
    for (const h of seen.values()) {
      const def = TEMPLATES[cls.template].params.find((p) => p.key === h.key)!;
      variables.push({
        symbol: def.symbol,
        meaning: def.label,
        unit: h.unit,
        domain: `${def.min} – ${def.max} ${def.unit}`,
        default_candidate: h.value,
        evidence_page: h.page,
        text_span: h.span,
        maps_to: h.key,
      });
    }
  }

  const equations = findEquations(pages);
  const centralQ = findSentences(pages, /\b(we (ask|study|show|derive|investigate|compute|model)|this (handout|note|paper|report) (shows|derives|asks|explains|models))\b/i, 1)[0];

  return {
    title,
    authors_as_stated: authorLine ? authorLine.split(/,|\band\b/).map((s) => s.trim()).filter(Boolean).slice(0, 10) : [],
    date_as_stated: date,
    pages_used: pages.map((p) => p.page),
    central_question: centralQ ?? "Not stated in a form the offline extractor can identify.",
    summary: "",
    equations,
    variables,
    measurements: findMeasurements(pages),
    limitations: findSentences(pages, /\b(limitation|we assume|assumes|neglect|ignor|does not (model|account|include)|only valid)\b/i, 5),
    candidate_template: cls.template,
    template_match_confidence: cls.confidence,
    template_rationale: cls.rationale,
    contradictions,
  };
}
