// Unit helpers. Every simulator works internally in SI-ish base units:
// metres, radians (internally), amp-hours, requests per second.

export const DEG_TO_RAD = Math.PI / 180;

export function degToRad(deg: number): number {
  return deg * DEG_TO_RAD;
}

export function radToDeg(rad: number): number {
  return rad / DEG_TO_RAD;
}

const LENGTH_TO_M: Record<string, number> = { m: 1, cm: 0.01, mm: 0.001 };
const CAPACITY_TO_AH: Record<string, number> = { ah: 1, mah: 0.001 };
const RATE_TO_PER_S: Record<string, number> = {
  "/s": 1,
  "per second": 1,
  "requests/s": 1,
  "req/s": 1,
  "/min": 1 / 60,
  "per minute": 1 / 60,
  "requests/min": 1 / 60,
  "/h": 1 / 3600,
  "per hour": 1 / 3600,
  "requests/h": 1 / 3600,
};

export type Dimension = "length" | "angle" | "capacity" | "rate" | "fraction" | "count" | "dimensionless";

/** Canonical unit label shown in the UI for each dimension. */
export const CANONICAL_UNIT: Record<Dimension, string> = {
  length: "m",
  angle: "deg",
  capacity: "Ah",
  rate: "req/s",
  fraction: "per cycle",
  count: "cycles",
  dimensionless: "",
};

export class UnitError extends Error {}

/**
 * Convert a value with a unit string into the canonical unit for a dimension.
 * Throws UnitError for unknown or incompatible units instead of guessing.
 */
export function toCanonical(value: number, unit: string, dim: Dimension): number {
  if (!Number.isFinite(value)) throw new UnitError(`Value ${value} is not a finite number`);
  const u = unit.trim().toLowerCase().replace(/\s+/g, " ");
  switch (dim) {
    case "length": {
      const f = LENGTH_TO_M[u];
      if (f === undefined) throw new UnitError(`"${unit}" is not a length unit (use m, cm or mm)`);
      return value * f;
    }
    case "angle": {
      if (["deg", "°", "degree", "degrees"].includes(u)) return value;
      if (["rad", "radian", "radians"].includes(u)) return radToDeg(value);
      throw new UnitError(`"${unit}" is not an angle unit (use deg or rad)`);
    }
    case "capacity": {
      const f = CAPACITY_TO_AH[u];
      if (f === undefined) throw new UnitError(`"${unit}" is not a capacity unit (use Ah or mAh)`);
      return value * f;
    }
    case "rate": {
      const f = RATE_TO_PER_S[u];
      if (f === undefined) throw new UnitError(`"${unit}" is not a rate unit (use req/s, /min or /h)`);
      return value * f;
    }
    case "fraction": {
      if (u === "%" || u === "percent") return value / 100;
      if (u === "" || u === "per cycle" || u === "fraction") return value;
      throw new UnitError(`"${unit}" is not a fraction unit (use % or a plain fraction)`);
    }
    case "count":
    case "dimensionless":
      return value;
  }
}

export function round(n: number, digits = 4): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}
