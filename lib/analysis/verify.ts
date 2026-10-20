import type { PaperAnalysis, RejectedItem, SourcePage } from "@/lib/ai/extract-schema";
import { findSpan } from "./spans";
import { TEMPLATES, type TemplateId } from "@/lib/models/templates";

/**
 * Drop every equation / variable / measurement whose page was not supplied
 * or whose quoted text span does not occur on that page. This is what stops an
 * extractor (AI or otherwise) from inventing evidence.
 */
export function verifyAgainstSource(
  analysis: PaperAnalysis,
  pages: SourcePage[],
): { analysis: PaperAnalysis; rejected: RejectedItem[] } {
  const byPage = new Map(pages.map((p) => [p.page, p.text]));
  const rejected: RejectedItem[] = [];

  const check = (page: number, span: string): string | null => {
    const text = byPage.get(page);
    if (text === undefined) return `cites page ${page}, which was not in the analysed pages`;
    if (!findSpan(text, span)) return `quoted text was not found on page ${page}`;
    return null;
  };

  const equations = analysis.equations.filter((e) => {
    const why = check(e.source_page, e.text_span);
    if (why) rejected.push({ kind: "equation", label: e.latex_string.slice(0, 60), reason: why });
    return !why;
  });

  const validParamKeys = new Set(
    analysis.candidate_template === "unsupported"
      ? []
      : TEMPLATES[analysis.candidate_template as TemplateId].params.map((p) => p.key),
  );

  const variables = analysis.variables
    .filter((v) => {
      const why = check(v.evidence_page, v.text_span);
      if (why) rejected.push({ kind: "variable", label: v.symbol, reason: why });
      return !why;
    })
    .map((v) => ({ ...v, maps_to: v.maps_to && validParamKeys.has(v.maps_to) ? v.maps_to : null }));

  const measurements = analysis.measurements.filter((m) => {
    const why = check(m.source_page, m.text_span);
    if (why) rejected.push({ kind: "measurement", label: m.description.slice(0, 60), reason: why });
    return !why;
  });

  const supplied = new Set(pages.map((p) => p.page));
  const pages_used = analysis.pages_used.filter((p) => supplied.has(p));

  return { analysis: { ...analysis, equations, variables, measurements, pages_used }, rejected };
}

/** Scan the source for signs the paper's model is richer than the template. */
export function detectMismatch(template: string, pages: SourcePage[]): { reason: string } | null {
  if (template === "unsupported") return null;
  const t = TEMPLATES[template as TemplateId];
  const all = pages.map((p) => p.text).join("\n");
  for (const m of t.mismatchCues) if (m.cue.test(all)) return { reason: m.reason };
  return null;
}
