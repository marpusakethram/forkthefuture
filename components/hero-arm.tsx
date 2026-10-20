"use client";
import { useState } from "react";
import { RobotArm } from "./robot-arm";
import { Slider } from "./ui/slider";
import { Math as TeX } from "./math";
import { forwardKinematics } from "@/lib/models/robot-arm";

const L1 = 1.0;
const L2 = 0.7;

export function HeroArm() {
  const [t1, setT1] = useState(35);
  const [t2, setT2] = useState(50);
  const s = forwardKinematics({ L1, L2, theta1: t1, theta2: t2 });

  return (
    <div className="rounded-[var(--radius-panel)] bg-studio p-3 text-studio-text shadow-[0_30px_80px_-30px_rgba(21,25,30,0.6)] sm:p-4" data-testid="hero-arm">
      <div className="aspect-square w-full overflow-hidden rounded-[20px]">
        <RobotArm L1={L1} L2={L2} theta1={t1} theta2={t2} title="Live two-link arm" />
      </div>
      <div className="space-y-4 px-2 pb-2 pt-4 sm:px-3">
        <div className="text-[15px] leading-relaxed text-studio-text">
          <TeX tex={`x = ${L1.toFixed(2)}\\cos ${t1}^\\circ + ${L2.toFixed(2)}\\cos ${t1 + t2}^\\circ = \\mathbf{${s.effector.x.toFixed(3)}}\\,\\text{m}`} />
          <br />
          <TeX tex={`y = ${L1.toFixed(2)}\\sin ${t1}^\\circ + ${L2.toFixed(2)}\\sin ${t1 + t2}^\\circ = \\mathbf{${s.effector.y.toFixed(3)}}\\,\\text{m}`} />
        </div>
        <label className="block">
          <span className="mb-1 flex justify-between text-sm text-studio-muted">
            <span>Shoulder θ₁</span>
            <span className="tabular text-studio-text" data-testid="hero-theta1">{t1}°</span>
          </span>
          <Slider min={-180} max={180} step={1} value={[t1]} onValueChange={([v]) => setT1(v)} thumbLabel="Shoulder angle θ1" />
        </label>
        <label className="block">
          <span className="mb-1 flex justify-between text-sm text-studio-muted">
            <span>Elbow θ₂</span>
            <span className="tabular text-studio-text" data-testid="hero-theta2">{t2}°</span>
          </span>
          <Slider min={-180} max={180} step={1} value={[t2]} onValueChange={([v]) => setT2(v)} thumbLabel="Elbow angle θ2" />
        </label>
        <p className="text-xs text-studio-muted">Illustrative values, not from a paper. The arm is drawn from the equations above, every frame.</p>
      </div>
    </div>
  );
}
