// One place that turns an experiment's parameters into model outputs, shared by the
// studio, the comparison view and the JSON export.
import { forwardKinematics } from "@/lib/models/robot-arm";
import { capacityAt, cyclesToThreshold } from "@/lib/models/battery";
import { mm1 } from "@/lib/models/queue";
import type { TemplateId } from "@/lib/models/templates";
import type { FadeMode } from "@/lib/models/battery";

export type Values = Record<string, number>;

export interface Output {
  label: string;
  value: string;
  raw: number | null;
}

export function armInput(v: Values, showTarget: boolean) {
  return { L1: v.L1, L2: v.L2, theta1: v.theta1, theta2: v.theta2, target: showTarget ? { x: v.targetX, y: v.targetY } : null };
}

export function batteryInput(v: Values, mode: FadeMode) {
  return { Q0: v.Q0, d: v.d, k: v.k, nMax: Math.round(v.nMax), tempFactor: v.tempFactor, mode };
}

const fmt = (n: number, d = 3) => (Number.isFinite(n) ? n.toFixed(d) : "—");

export function outputs(template: TemplateId, v: Values, opts: { fadeMode: FadeMode; showTarget: boolean }): Output[] {
  try {
    if (template === "robot-arm") {
      const s = forwardKinematics(armInput(v, opts.showTarget));
      const o: Output[] = [
        { label: "Hand x", value: `${fmt(s.effector.x)} m`, raw: s.effector.x },
        { label: "Hand y", value: `${fmt(s.effector.y)} m`, raw: s.effector.y },
        { label: "Distance from base", value: `${fmt(s.reach)} m`, raw: s.reach },
        { label: "Elbow position (x₁, y₁)", value: `${fmt(s.elbow.x)}, ${fmt(s.elbow.y)} m`, raw: null },
      ];
      if (s.targetDistance !== null) o.push({ label: "Distance to target", value: `${fmt(s.targetDistance)} m`, raw: s.targetDistance });
      return o;
    }
    if (template === "battery-fade") {
      const b = batteryInput(v, opts.fadeMode);
      const end = capacityAt(b, b.nMax);
      const n80 = cyclesToThreshold(b);
      return [
        { label: `Capacity left after ${b.nMax} cycles`, value: `${fmt(end)} Ah`, raw: end },
        { label: "Percent of new capacity", value: `${fmt((end / b.Q0) * 100, 1)} %`, raw: end / b.Q0 },
        { label: "Cycles until 80% (end of life)", value: n80 === null ? `Not within ${b.nMax} cycles` : `${n80}`, raw: n80 },
      ];
    }
    const r = mm1({ lambda: v.lambda, mu: v.mu });
    if (!r.stable)
      return [
        { label: "Server busy (ρ)", value: `${fmt(r.rho * 100, 0)}%`, raw: r.rho },
        { label: "Average time per request (W)", value: "Unstable — no steady state", raw: null },
        { label: "Average wait in line (Wq)", value: "Unstable — no steady state", raw: null },
      ];
    return [
      { label: "Server busy (ρ)", value: `${fmt(r.rho * 100, 0)}%`, raw: r.rho },
      { label: "Average time per request (W)", value: `${fmt(r.W * 1000, 1)} ms`, raw: r.W },
      { label: "Average wait in line (Wq)", value: `${fmt(r.Wq * 1000, 1)} ms`, raw: r.Wq },
      { label: "Requests in the system (L)", value: fmt(r.L, 2), raw: r.L },
    ];
  } catch (e) {
    return [{ label: "Invalid input", value: (e as Error).message, raw: null }];
  }
}
