import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { analyzeOffline, classify } from "@/lib/analysis/offline";
import { detectMismatch, verifyAgainstSource } from "@/lib/analysis/verify";
import { findSpan } from "@/lib/analysis/spans";
import { PaperAnalysisSchema, type PaperAnalysis } from "@/lib/ai/extract-schema";
import { fixturePages } from "./helpers";

const golden = JSON.parse(readFileSync("fixtures/models/expected-mappings.json", "utf8")) as Record<
  string,
  { template: string; params: Record<string, { value: number; page: number }> }
>;

describe("offline extraction on golden fixtures", () => {
  for (const [file, exp] of Object.entries(golden)) {
    it(`${file} → ${exp.template}`, async () => {
      const pages = await fixturePages(file);
      const raw = analyzeOffline(pages);
      expect(PaperAnalysisSchema.safeParse(raw).success).toBe(true);
      const { analysis, rejected } = verifyAgainstSource(raw, pages);
      expect(rejected).toEqual([]);
      expect(analysis.candidate_template).toBe(exp.template);
      const mapped = Object.fromEntries(analysis.variables.filter((v) => v.maps_to).map((v) => [v.maps_to!, v]));
      expect(Object.keys(mapped).sort()).toEqual(Object.keys(exp.params).sort());
      for (const [k, e] of Object.entries(exp.params)) {
        expect(mapped[k].default_candidate).toBeCloseTo(e.value, 9);
        expect(mapped[k].evidence_page).toBe(e.page);
      }
    });
  }

  it("finds the kinematics equations on page 1 with verbatim spans", async () => {
    const pages = await fixturePages("two-link-arm-handout.pdf");
    const a = analyzeOffline(pages);
    const spans = a.equations.map((e) => e.text_span);
    expect(spans).toContain("x = L1 cos(theta1) + L2 cos(theta1 + theta2)");
    expect(a.equations.every((e) => e.source_page === 1)).toBe(true);
    expect(a.equations[0].latex_string).toContain("\\cos");
  });

  it("classifies unrelated text as unsupported", () => {
    const r = classify([{ page: 1, text: "We measured rainfall and soil moisture in a forest plot over three weeks." }]);
    expect(r.template).toBe("unsupported");
  });
});

describe("source verification", () => {
  const pages = [{ page: 1, text: "The arm has L1 = 0.5 m and\nL2 = 0.3 m." }];
  const base: PaperAnalysis = PaperAnalysisSchema.parse({
    title: "t",
    pages_used: [1, 7],
    central_question: "q",
    candidate_template: "robot-arm",
    template_match_confidence: 0.8,
    equations: [],
    variables: [
      { symbol: "L_1", meaning: "link", evidence_page: 1, text_span: "L1 = 0.5 m", default_candidate: 0.5, maps_to: "L1" },
      { symbol: "L_2", meaning: "link", evidence_page: 1, text_span: "and L2 = 0.3 m", default_candidate: 0.3, maps_to: "L2" },
      { symbol: "L_3", meaning: "invented", evidence_page: 1, text_span: "L3 = 0.9 m", default_candidate: 0.9, maps_to: "L1" },
      { symbol: "θ", meaning: "wrong page", evidence_page: 7, text_span: "theta", default_candidate: 1, maps_to: "theta1" },
      { symbol: "x", meaning: "bad key", evidence_page: 1, text_span: "The arm", default_candidate: 1, maps_to: "not_a_param" },
    ],
  });

  it("keeps spans that exist (across line breaks) and rejects invented or off-page ones", () => {
    const { analysis, rejected } = verifyAgainstSource(base, pages);
    expect(analysis.variables.map((v) => v.symbol)).toEqual(["L_1", "L_2", "x"]);
    expect(rejected.map((r) => r.label)).toEqual(["L_3", "θ"]);
    expect(rejected[1].reason).toMatch(/page 7/);
    expect(analysis.pages_used).toEqual([1]);
  });

  it("drops maps_to keys that are not template parameters", () => {
    const { analysis } = verifyAgainstSource(base, pages);
    expect(analysis.variables.find((v) => v.symbol === "x")!.maps_to).toBeNull();
  });

  it("findSpan returns offsets in the original text", () => {
    const text = "Alpha  beta\ngamma";
    const loc = findSpan(text, "beta gamma")!;
    expect(text.slice(loc.start, loc.end)).toBe("beta\ngamma");
    expect(findSpan(text, "delta")).toBeNull();
  });
});

describe("model mismatch", () => {
  it("flags a square-root fade paper as not implemented by the geometric template", () => {
    const m = detectMismatch("battery-fade", [{ page: 1, text: "Capacity loss follows a square-root dependence on cycle number due to SEI growth." }]);
    expect(m?.reason).toMatch(/simplified conceptual/);
  });

  it("does not flag the clean battery note", async () => {
    expect(detectMismatch("battery-fade", await fixturePages("battery-fade-note.pdf"))).toBeNull();
  });

  it("flags multi-server queues", () => {
    expect(detectMismatch("queue-mm1", [{ page: 1, text: "We analyse an M/M/c system with 8 GPUs." }])).not.toBeNull();
  });
});
