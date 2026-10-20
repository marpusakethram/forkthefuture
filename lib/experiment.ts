import type { AnalyzeResponse, SourcePage } from "@/lib/ai/extract-schema";
import { TEMPLATES, type TemplateId } from "@/lib/models/templates";
import type { FadeMode } from "@/lib/models/battery";

export type Provenance = "paper" | "user" | "illustrative";

export interface ParamState {
  value: number;
  provenance: Provenance;
  /** Where the paper states this value. Present whenever the value originally came from the paper. */
  evidence?: { page: number; span: string; symbol: string };
  /** The value the paper states, kept after the user adjusts it. */
  paperValue?: number;
}

export interface SourceInfo {
  kind: "pdf" | "text" | "sample";
  fileName: string | null;
  sha256: string | null;
  title: string;
  authors: string[];
  date: string | null;
  attribution: string;
}

export interface Experiment {
  id: string;
  createdAt: string;
  template: TemplateId;
  demo: boolean;
  source: SourceInfo | null;
  pages: SourcePage[];
  analysis: AnalyzeResponse | null;
  params: Record<string, ParamState>;
  options: { fadeMode: FadeMode; showTarget: boolean };
}

export const DEMO_IDS: Record<string, TemplateId> = {
  "demo-arm": "robot-arm",
  "demo-battery": "battery-fade",
  "demo-queue": "queue-mm1",
};

export function illustrativeParams(template: TemplateId): Record<string, ParamState> {
  return Object.fromEntries(TEMPLATES[template].params.map((p) => [p.key, { value: p.default, provenance: "illustrative" as const }]));
}

export function demoExperiment(id: string): Experiment | null {
  const template = DEMO_IDS[id];
  if (!template) return null;
  return {
    id,
    createdAt: new Date(0).toISOString(),
    template,
    demo: true,
    source: null,
    pages: [],
    analysis: null,
    params: illustrativeParams(template),
    options: { fadeMode: "geometric", showTarget: false },
  };
}

export interface ConfirmedParam {
  key: string;
  value: number;
  page: number;
  span: string;
  symbol: string;
}

/** Build an experiment from user-confirmed paper values; everything else stays illustrative. */
export function experimentFromConfirmed(args: {
  id: string;
  template: TemplateId;
  source: SourceInfo;
  pages: SourcePage[];
  analysis: AnalyzeResponse;
  confirmed: ConfirmedParam[];
}): Experiment {
  const params = illustrativeParams(args.template);
  for (const c of args.confirmed) {
    const def = TEMPLATES[args.template].params.find((p) => p.key === c.key);
    if (!def) continue;
    const inRange = c.value >= def.min && c.value <= def.max;
    params[c.key] = {
      value: inRange ? c.value : Math.min(def.max, Math.max(def.min, c.value)),
      provenance: inRange ? "paper" : "user",
      evidence: { page: c.page, span: c.span, symbol: c.symbol },
      paperValue: c.value,
    };
  }
  return {
    id: args.id,
    createdAt: new Date().toISOString(),
    template: args.template,
    demo: false,
    source: args.source,
    pages: args.pages,
    analysis: args.analysis,
    params,
    options: { fadeMode: "geometric", showTarget: false },
  };
}

export function newId(): string {
  return `p-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
