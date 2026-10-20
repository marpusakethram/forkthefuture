export const BATTERY_MODEL = {
  id: "battery-fade",
  name: "Battery capacity fade — empirical educational model",
  version: "1.0.0",
  equations: {
    geometric: String.raw`Q(n) = Q_0\,(1-d)^{n}`,
    linear: String.raw`Q(n) = \max\!\left(0,\; Q_0 - k\,n\right)`,
  },
  assumptions: [
    "Empirical curve shape only — not an electrochemical model (no SEI growth, lithium plating, or knee).",
    "Every cycle is identical (same depth of discharge, C-rate and temperature).",
    "The temperature factor is an illustrative multiplier on the fade rate, not a physical Arrhenius law.",
  ],
} as const;

export type FadeMode = "geometric" | "linear";

export interface BatteryInput {
  Q0: number; // Ah
  mode: FadeMode;
  d: number; // fractional loss per cycle (geometric), 0 <= d < 1
  k: number; // Ah lost per cycle (linear)
  nMax: number; // cycles to simulate
  tempFactor: number; // illustrative multiplier on fade rate, 1 = none
}

export class BatteryInputError extends Error {}

export function validateBattery(b: BatteryInput): void {
  if (!Number.isFinite(b.Q0) || b.Q0 <= 0 || b.Q0 > 1000) throw new BatteryInputError("Q0 must be between 0 and 1000 Ah");
  if (!Number.isFinite(b.d) || b.d < 0 || b.d >= 1) throw new BatteryInputError("d must satisfy 0 ≤ d < 1");
  if (!Number.isFinite(b.k) || b.k < 0) throw new BatteryInputError("k must be ≥ 0 Ah per cycle");
  if (!Number.isInteger(b.nMax) || b.nMax < 1 || b.nMax > 20000) throw new BatteryInputError("Cycle limit must be an integer from 1 to 20000");
  if (!Number.isFinite(b.tempFactor) || b.tempFactor <= 0 || b.tempFactor > 5) throw new BatteryInputError("Temperature factor must be in (0, 5]");
}

/** Effective per-cycle loss after the illustrative temperature multiplier. */
function effectiveD(b: BatteryInput): number {
  return Math.min(b.d * b.tempFactor, 0.999999);
}

export function capacityAt(b: BatteryInput, n: number): number {
  if (n < 0) throw new BatteryInputError("Cycle number must be ≥ 0");
  if (b.mode === "geometric") return b.Q0 * Math.pow(1 - effectiveD(b), n);
  return Math.max(0, b.Q0 - b.k * b.tempFactor * n);
}

export interface FadePoint {
  cycle: number;
  capacity: number;
  retention: number; // 0..1
}

export function fadeCurve(b: BatteryInput, points = 200): FadePoint[] {
  validateBattery(b);
  const step = Math.max(1, Math.ceil(b.nMax / points));
  const out: FadePoint[] = [];
  for (let n = 0; n <= b.nMax; n += step) {
    const c = capacityAt(b, n);
    out.push({ cycle: n, capacity: c, retention: c / b.Q0 });
  }
  if (out[out.length - 1].cycle !== b.nMax) {
    const c = capacityAt(b, b.nMax);
    out.push({ cycle: b.nMax, capacity: c, retention: c / b.Q0 });
  }
  return out;
}

/**
 * First integer cycle at which retention falls to `threshold` (default 80%).
 * Returns null when it does not happen within nMax.
 */
export function cyclesToThreshold(b: BatteryInput, threshold = 0.8): number | null {
  validateBattery(b);
  let n: number;
  if (b.mode === "geometric") {
    const d = effectiveD(b);
    if (d === 0) return null;
    n = Math.ceil(Math.log(threshold) / Math.log(1 - d) - 1e-9);
  } else {
    const k = b.k * b.tempFactor;
    if (k === 0) return null;
    n = Math.ceil(((1 - threshold) * b.Q0) / k - 1e-9);
  }
  return n <= b.nMax ? n : null;
}

export const BATTERY_DEFAULTS: BatteryInput = { Q0: 3.0, mode: "geometric", d: 0.0004, k: 0.001, nMax: 1500, tempFactor: 1 };
