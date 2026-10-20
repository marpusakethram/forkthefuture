import type { Experiment } from "@/lib/experiment";
import { TEMPLATES } from "@/lib/models/templates";
import { outputs } from "@/lib/simulate";

export const SCENARIO_SCHEMA = "forkthefuture.scenario/1";

export function attributionLine(e: Experiment): string {
  if (!e.source) return "Illustrative demo — no source paper. All values are sample values.";
  const who = e.source.authors.length ? e.source.authors.join(", ") : "authors not stated";
  return `${e.source.title} — ${who}${e.source.date ? ` (${e.source.date})` : ""}. ${e.source.attribution}`;
}

export function buildScenario(e: Experiment) {
  const t = TEMPLATES[e.template];
  const values = Object.fromEntries(Object.entries(e.params).map(([k, p]) => [k, p.value]));
  return {
    schema: SCENARIO_SCHEMA,
    exportedAt: new Date().toISOString(),
    model: { id: t.modelId, name: t.name, version: t.version, equations: t.equations, assumptions: t.assumptions },
    options: e.options,
    parameters: t.params.map((p) => ({
      key: p.key,
      label: p.label,
      value: e.params[p.key].value,
      unit: p.unit,
      provenance: e.params[p.key].provenance,
      paperValue: e.params[p.key].paperValue ?? null,
      evidence: e.params[p.key].evidence ?? null,
    })),
    outputs: outputs(e.template, values, e.options).map(({ label, value }) => ({ label, value })),
    source: e.source
      ? {
          title: e.source.title,
          authors: e.source.authors,
          date: e.source.date,
          fileName: e.source.fileName,
          sha256: e.source.sha256,
          attribution: e.source.attribution,
          extractor: e.analysis?.engine ?? null,
          extractorModel: e.analysis?.model ?? null,
          modelMismatch: e.analysis?.mismatch?.reason ?? null,
        }
      : null,
    statement:
      "This scenario evaluates a template equation with the listed parameters. It is not a reproduction of the source's full results.",
  };
}
