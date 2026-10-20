import { describe, expect, it } from "vitest";
import vm from "node:vm";
import { buildStandaloneHtml, STANDALONE_MODEL_JS } from "@/lib/export/standalone-html";
import { buildScenario } from "@/lib/export/scenario";
import { demoExperiment, experimentFromConfirmed } from "@/lib/experiment";
import { forwardKinematics } from "@/lib/models/robot-arm";
import { capacityAt, cyclesToThreshold } from "@/lib/models/battery";
import { mm1 } from "@/lib/models/queue";
import type { AnalyzeResponse } from "@/lib/ai/extract-schema";

const ctx = vm.createContext({ Math });
vm.runInContext(STANDALONE_MODEL_JS, ctx);
const compute = (t: string, v: object, o: object) => vm.runInContext(`ftfCompute(${JSON.stringify(t)}, ${JSON.stringify(v)}, ${JSON.stringify(o)})`, ctx);

describe("standalone export math matches the tested TypeScript models", () => {
  it("robot arm", () => {
    const v = { L1: 0.5, L2: 0.3, theta1: 30, theta2: 45 };
    const js = compute("robot-arm", v, {});
    const ts = forwardKinematics(v);
    expect(js.effector[0]).toBeCloseTo(ts.effector.x, 12);
    expect(js.effector[1]).toBeCloseTo(ts.effector.y, 12);
  });
  it("battery", () => {
    const b = { Q0: 2.5, d: 0.0005, k: 0.001, nMax: 1000, tempFactor: 1, mode: "geometric" as const };
    const js = compute("battery-fade", b, { fadeMode: "geometric" });
    expect(js.curve[1000]).toBeCloseTo(capacityAt(b, 1000), 12);
    expect(js.n80).toBe(cyclesToThreshold(b));
  });
  it("queue, including the unstable case", () => {
    const js = compute("queue-mm1", { lambda: 9, mu: 12 }, {});
    const ts = mm1({ lambda: 9, mu: 12 });
    expect(ts.stable && js.W).toBeCloseTo(ts.stable ? ts.W : 0, 12);
    expect(compute("queue-mm1", { lambda: 12, mu: 12 }, {}).stable).toBe(false);
  });
});

describe("exports carry provenance and stay offline", () => {
  const analysis = { analysis: {}, engine: "offline-rules", model: null, rejected: [], warnings: [], mismatch: { reason: "nonlinear fade" } } as unknown as AnalyzeResponse;
  const exp = experimentFromConfirmed({
    id: "p-test",
    template: "battery-fade",
    source: { kind: "sample", fileName: "battery-fade-note.pdf", sha256: "abc", title: "Capacity Fade Note", authors: ["Example Lab"], date: "Oct 2026", attribution: "CC BY 4.0" },
    pages: [],
    analysis,
    confirmed: [{ key: "Q0", value: 2.5, page: 1, span: "rated capacity of 2.5 Ah", symbol: "rated capacity" }],
  });

  it("scenario JSON records model version and per-parameter provenance", () => {
    const s = buildScenario(exp);
    expect(s.model.version).toBe("1.0.0");
    const q0 = s.parameters.find((p) => p.key === "Q0")!;
    expect(q0.provenance).toBe("paper");
    expect(q0.evidence).toEqual({ page: 1, span: "rated capacity of 2.5 Ah", symbol: "rated capacity" });
    expect(s.parameters.find((p) => p.key === "d")!.provenance).toBe("illustrative");
    expect(s.source?.modelMismatch).toBe("nonlinear fade");
  });

  it("standalone HTML has attribution, limits, mismatch notice and no network references", () => {
    const html = buildStandaloneHtml(exp);
    expect(html).toContain("Capacity Fade Note");
    expect(html).toContain("CC BY 4.0");
    expect(html).toContain("Not an implementation of the paper’s model");
    expect(html).toContain("Limits");
    expect(html).not.toMatch(/<(script|link|img)[^>]+(src|href)=["']?https?:/i);
    expect(html).not.toMatch(/fetch\(|XMLHttpRequest/);
  });

  it("demo exports say the values are illustrative", () => {
    const html = buildStandaloneHtml(demoExperiment("demo-arm")!);
    expect(html).toContain("Illustrative demo — no source paper");
  });
});
