import { describe, expect, it } from "vitest";
import { degToRad, toCanonical, UnitError } from "@/lib/models/units";
import { checkParam, checkParams } from "@/lib/models/validation";
import { defaultParams } from "@/lib/models/templates";

describe("units", () => {
  it("converts lengths, angles, capacity and rates to canonical units", () => {
    expect(toCanonical(250, "mm", "length")).toBeCloseTo(0.25);
    expect(toCanonical(30, "cm", "length")).toBeCloseTo(0.3);
    expect(toCanonical(Math.PI / 2, "rad", "angle")).toBeCloseTo(90);
    expect(toCanonical(2500, "mAh", "capacity")).toBeCloseTo(2.5);
    expect(toCanonical(600, "/min", "rate")).toBeCloseTo(10);
    expect(toCanonical(0.05, "%", "fraction")).toBeCloseTo(0.0005);
    expect(degToRad(180)).toBeCloseTo(Math.PI);
  });

  it("refuses incompatible units instead of guessing", () => {
    expect(() => toCanonical(1, "kg", "length")).toThrow(UnitError);
    expect(() => toCanonical(1, "m", "angle")).toThrow(UnitError);
    expect(() => toCanonical(1, "Ah", "rate")).toThrow(UnitError);
  });
});

describe("parameter validation", () => {
  it("accepts every template's defaults", () => {
    for (const id of ["robot-arm", "battery-fade", "queue-mm1"] as const) expect(checkParams(id, defaultParams(id)).ok).toBe(true);
  });

  it("flags out-of-range values with the unit", () => {
    expect(checkParam("robot-arm", "L1", 0)).toMatch(/between 0.1 and 3 m/);
    expect(checkParam("battery-fade", "d", 2)).toMatch(/Fade per cycle/);
    const r = checkParams("queue-mm1", { lambda: -1, mu: 10 });
    expect(r.ok).toBe(false);
  });
});
