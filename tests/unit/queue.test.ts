import { describe, expect, it } from "vitest";
import { latencyCurve, mm1, QueueInputError } from "@/lib/models/queue";

describe("M/M/1 queue", () => {
  it("λ = 0 gives W = 1/μ and Wq = 0", () => {
    const r = mm1({ lambda: 0, mu: 10 });
    expect(r.stable).toBe(true);
    if (!r.stable) return;
    expect(r.W).toBeCloseTo(0.1, 12);
    expect(r.Wq).toBe(0);
    expect(r.rho).toBe(0);
  });

  it("matches hand calculation for λ=9, μ=12 req/s", () => {
    const r = mm1({ lambda: 9, mu: 12 });
    if (!r.stable) throw new Error("expected stable");
    expect(r.rho).toBeCloseTo(0.75, 12);
    expect(r.W).toBeCloseTo(1 / 3, 12); // seconds
    expect(r.Wq).toBeCloseTo(9 / (12 * 3), 12); // 0.25 s
    expect(r.L).toBeCloseTo(3, 12); // Little's law: L = λW
  });

  it("latency diverges as λ approaches μ", () => {
    const ws = [0.9, 0.99, 0.999].map((f) => {
      const r = mm1({ lambda: 10 * f, mu: 10 });
      return r.stable ? r.W : Infinity;
    });
    expect(ws[1]).toBeGreaterThan(ws[0] * 9);
    expect(ws[2]).toBeGreaterThan(ws[1] * 9);
  });

  it.each([10, 12])("λ = %d ≥ μ = 10 is unstable with no finite waiting time", (lambda) => {
    const r = mm1({ lambda, mu: 10 });
    expect(r.stable).toBe(false);
    expect("W" in r).toBe(false);
  });

  it("latency curve marks the unstable region as null", () => {
    const c = latencyCurve(10);
    expect(c[0].W).toBeCloseTo(0.1);
    expect(c.filter((p) => p.lambda >= 10).every((p) => p.W === null)).toBe(true);
    expect(c.filter((p) => p.lambda < 10).every((p) => p.W !== null && p.W > 0)).toBe(true);
  });

  it("rejects non-positive service rate and negative arrivals", () => {
    expect(() => mm1({ lambda: 1, mu: 0 })).toThrow(QueueInputError);
    expect(() => mm1({ lambda: -1, mu: 5 })).toThrow(QueueInputError);
  });
});
