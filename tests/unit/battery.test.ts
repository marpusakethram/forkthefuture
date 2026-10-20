import { describe, expect, it } from "vitest";
import { capacityAt, cyclesToThreshold, fadeCurve, BatteryInputError, type BatteryInput } from "@/lib/models/battery";

const base: BatteryInput = { Q0: 2.5, mode: "geometric", d: 0.0005, k: 0.001, nMax: 1000, tempFactor: 1 };

describe("battery capacity fade", () => {
  it("capacity at cycle 0 equals Q0", () => {
    expect(capacityAt(base, 0)).toBe(2.5);
    expect(capacityAt({ ...base, mode: "linear" }, 0)).toBe(2.5);
  });

  it("matches Q0(1-d)^n by hand", () => {
    // 2.5 * 0.9995^1000 = 1.51603...
    expect(capacityAt(base, 1000)).toBeCloseTo(2.5 * Math.pow(0.9995, 1000), 12);
    expect(capacityAt(base, 1000)).toBeCloseTo(1.5160, 3);
  });

  it("curve is non-increasing and never negative for d ≥ 0", () => {
    for (const mode of ["geometric", "linear"] as const) {
      const c = fadeCurve({ ...base, mode, k: 0.01, nMax: 2000 });
      for (let i = 1; i < c.length; i++) expect(c[i].capacity).toBeLessThanOrEqual(c[i - 1].capacity);
      expect(Math.min(...c.map((p) => p.capacity))).toBeGreaterThanOrEqual(0);
    }
  });

  it("d = 0 means no fade and no threshold crossing", () => {
    expect(capacityAt({ ...base, d: 0 }, 500)).toBe(2.5);
    expect(cyclesToThreshold({ ...base, d: 0 })).toBeNull();
  });

  it("cycles to 80% is ceil(ln 0.8 / ln(1-d))", () => {
    const n = cyclesToThreshold({ ...base, nMax: 2000 })!;
    expect(n).toBe(Math.ceil(Math.log(0.8) / Math.log(0.9995)));
    expect(capacityAt(base, n) / base.Q0).toBeLessThanOrEqual(0.8);
    expect(capacityAt(base, n - 1) / base.Q0).toBeGreaterThan(0.8);
  });

  it("returns null when 80% is outside the simulated range", () => {
    expect(cyclesToThreshold({ ...base, nMax: 100 })).toBeNull();
  });

  it("linear mode crosses 80% at 0.2·Q0/k", () => {
    expect(cyclesToThreshold({ ...base, mode: "linear", k: 0.001 })).toBe(500);
  });

  it("rejects d outside [0, 1)", () => {
    expect(() => fadeCurve({ ...base, d: 1 })).toThrow(BatteryInputError);
    expect(() => fadeCurve({ ...base, d: -0.1 })).toThrow(BatteryInputError);
  });
});
