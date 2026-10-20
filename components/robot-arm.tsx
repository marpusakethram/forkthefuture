"use client";
import { forwardRef, useEffect, useId, useRef, useState } from "react";
import { forwardKinematics, type ArmInput } from "@/lib/models/robot-arm";
import { cn } from "@/lib/utils";

export interface ArmPose {
  L1: number;
  L2: number;
  theta1: number;
  theta2: number;
}

interface Props extends ArmPose {
  target?: { x: number; y: number } | null;
  ghosts?: (ArmPose & { label: string })[];
  onPickTarget?: (p: { x: number; y: number }) => void;
  /** Draw on-plot explanations: angle arcs, link lengths, coordinate drop-lines, reach label. */
  annotate?: boolean;
  className?: string;
  title?: string;
}

const GRID_STEPS = [0.05, 0.1, 0.2, 0.25, 0.5, 1, 2, 5];
const DEG = Math.PI / 180;

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

/**
 * Tweens joint angles (not screen positions) toward the requested pose, so every
 * drawn frame is an exact forward-kinematics solution of some valid pose.
 */
function useTweenedPose(pose: ArmPose, reduced: boolean): ArmPose {
  const [shown, setShown] = useState(pose);
  const shownRef = useRef(pose);
  useEffect(() => {
    if (reduced) {
      shownRef.current = pose;
      setShown(pose);
      return;
    }
    let raf = 0;
    const tick = () => {
      const s = shownRef.current;
      const next: ArmPose = {
        L1: s.L1 + (pose.L1 - s.L1) * 0.3,
        L2: s.L2 + (pose.L2 - s.L2) * 0.3,
        theta1: s.theta1 + (pose.theta1 - s.theta1) * 0.3,
        theta2: s.theta2 + (pose.theta2 - s.theta2) * 0.3,
      };
      const done =
        Math.abs(next.theta1 - pose.theta1) < 0.05 &&
        Math.abs(next.theta2 - pose.theta2) < 0.05 &&
        Math.abs(next.L1 - pose.L1) < 1e-4 &&
        Math.abs(next.L2 - pose.L2) < 1e-4;
      shownRef.current = done ? pose : next;
      setShown(shownRef.current);
      if (!done) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [pose.L1, pose.L2, pose.theta1, pose.theta2, reduced]); // eslint-disable-line react-hooks/exhaustive-deps
  return shown;
}

function fk(p: ArmPose) {
  return forwardKinematics({ ...p, target: null } as ArmInput);
}

/** SVG arc path (y-up world coordinates) around (cx, cy) from angle a0 to a1 in degrees. */
function arc(cx: number, cy: number, r: number, a0: number, a1: number) {
  const x0 = cx + r * Math.cos(a0 * DEG);
  const y0 = cy + r * Math.sin(a0 * DEG);
  const x1 = cx + r * Math.cos(a1 * DEG);
  const y1 = cy + r * Math.sin(a1 * DEG);
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
  const sweep = a1 > a0 ? 1 : 0;
  return `M ${x0} ${y0} A ${r} ${r} 0 ${large} ${sweep} ${x1} ${y1}`;
}

/** One rigid link drawn as a machined aluminium bar with end caps, rotated into place. */
function LinkBar({ from, angle, length, width, gradId, edge }: { from: { x: number; y: number }; angle: number; length: number; width: number; gradId: string; edge: string }) {
  return (
    <g transform={`translate(${from.x} ${from.y}) rotate(${angle})`}>
      <rect x={-width / 2} y={-width / 2} width={length + width} height={width} rx={width / 2} fill={`url(#${gradId})`} stroke={edge} strokeWidth={width * 0.06} />
      {/* recessed slot, like a real extruded link */}
      <rect x={width * 0.55} y={-width * 0.12} width={Math.max(0, length - width * 1.1)} height={width * 0.24} rx={width * 0.12} fill="rgba(0,0,0,0.28)" />
    </g>
  );
}

/** Servo-style joint: housing, ring, bolt circle and cap. */
function Joint({ x, y, r, housingId }: { x: number; y: number; r: number; housingId: string }) {
  const bolts = [0, 60, 120, 180, 240, 300];
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={`url(#${housingId})`} stroke="#0b0e12" strokeWidth={r * 0.08} />
      <circle cx={x} cy={y} r={r * 0.72} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={r * 0.06} />
      {bolts.map((a) => (
        <circle key={a} cx={x + r * 0.55 * Math.cos(a * DEG)} cy={y + r * 0.55 * Math.sin(a * DEG)} r={r * 0.08} fill="#9aa6b2" />
      ))}
      <circle cx={x} cy={y} r={r * 0.28} fill="#d6dde4" stroke="#0b0e12" strokeWidth={r * 0.05} />
    </g>
  );
}

/** Two-finger gripper aligned with link 2. */
function Gripper({ at, angle, size }: { at: { x: number; y: number }; angle: number; size: number }) {
  return (
    <g transform={`translate(${at.x} ${at.y}) rotate(${angle})`}>
      <rect x={-size * 0.1} y={-size * 0.55} width={size * 0.35} height={size * 1.1} rx={size * 0.08} fill="#3b4652" stroke="#0b0e12" strokeWidth={size * 0.04} />
      <rect x={size * 0.2} y={-size * 0.55} width={size * 0.75} height={size * 0.22} rx={size * 0.07} fill="#c9d3dd" stroke="#0b0e12" strokeWidth={size * 0.04} />
      <rect x={size * 0.2} y={size * 0.33} width={size * 0.75} height={size * 0.22} rx={size * 0.07} fill="#c9d3dd" stroke="#0b0e12" strokeWidth={size * 0.04} />
    </g>
  );
}

const fmt = (n: number) => (Math.abs(n) < 0.0005 ? "0.000" : n.toFixed(3));

export const RobotArm = forwardRef<SVGSVGElement, Props>(function RobotArm(
  { L1, L2, theta1, theta2, target, ghosts = [], onPickTarget, annotate = true, className, title = "Two-link robot arm" },
  ref,
) {
  const uid = useId().replace(/:/g, "");
  const reduced = usePrefersReducedMotion();
  const shown = useTweenedPose({ L1, L2, theta1, theta2 }, reduced);
  const s = fk(shown);
  const exact = fk({ L1, L2, theta1, theta2 });
  const targetR = target ? Math.hypot(target.x, target.y) : 0;
  const targetReachable = !!target && targetR >= Math.abs(L1 - L2) - 1e-12 && targetR <= L1 + L2 + 1e-12;

  const reachMax = Math.max(L1 + L2, ...ghosts.map((g) => g.L1 + g.L2), target ? Math.hypot(target.x, target.y) : 0);
  const extent = reachMax * 1.22;
  const step = GRID_STEPS.find((g) => extent / g <= 5) ?? 5;
  const ticks: number[] = [];
  for (let v = -Math.floor(extent / step) * step; v <= extent + 1e-9; v += step) ticks.push(Math.round(v / step) * step);

  const u = extent / 60; // one "unit" of drawing size in world metres
  const fs = u * 2.5; // label font size
  const linkW1 = u * 3.4;
  const linkW2 = u * 2.8;
  const a1 = shown.theta1;
  const a12 = shown.theta1 + shown.theta2;

  const onClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!onPickTarget) return;
    const svg = e.currentTarget;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const m = svg.getScreenCTM();
    if (!m) return;
    const p = pt.matrixTransform(m.inverse());
    onPickTarget({ x: Math.round(p.x * 100) / 100, y: Math.round(-p.y * 100) / 100 });
  };

  const annulus = `M ${-s.maxReach} 0 a ${s.maxReach} ${s.maxReach} 0 1 0 ${2 * s.maxReach} 0 a ${s.maxReach} ${s.maxReach} 0 1 0 ${-2 * s.maxReach} 0 Z ${
    s.minReach > 0 ? `M ${-s.minReach} 0 a ${s.minReach} ${s.minReach} 0 1 0 ${2 * s.minReach} 0 a ${s.minReach} ${s.minReach} 0 1 0 ${-2 * s.minReach} 0 Z` : ""
  }`;

  // Label helper: world (x, y-up) → SVG text with a dark pill behind it for legibility.
  const Label = ({ x, y, text, color = "#e6ebf0", anchor = "middle", size = fs, testId }: { x: number; y: number; text: string; color?: string; anchor?: "start" | "middle" | "end"; size?: number; testId?: string }) => {
    const w = text.length * size * 0.56 + size * 0.9;
    const bx = anchor === "middle" ? x - w / 2 : anchor === "start" ? x - size * 0.45 : x - w + size * 0.45;
    return (
      <g data-testid={testId}>
        <rect x={bx} y={-y - size * 0.85} width={w} height={size * 1.25} rx={size * 0.35} fill="rgba(13,16,20,0.82)" />
        <text x={x} y={-y} fontSize={size} fill={color} textAnchor={anchor} fontWeight={600} style={{ fontVariantNumeric: "tabular-nums" }}>
          {text}
        </text>
      </g>
    );
  };

  const elbowExt = { x: s.elbow.x + Math.cos(a1 * DEG) * L2 * 0.45, y: s.elbow.y + Math.sin(a1 * DEG) * L2 * 0.45 };
  const r1 = Math.min(L1 * 0.32, extent * 0.14);
  const r2 = Math.min(L2 * 0.32, extent * 0.11);
  const midA1 = (0 + a1) / 2;
  const midA2 = (a1 + a12) / 2;
  const mid1 = { x: s.elbow.x / 2, y: s.elbow.y / 2 };
  const mid2 = { x: (s.elbow.x + s.effector.x) / 2, y: (s.elbow.y + s.effector.y) / 2 };
  const perp = (deg: number, d: number) => ({ x: -Math.sin(deg * DEG) * d, y: Math.cos(deg * DEG) * d });
  const p1 = perp(a1, u * 3.6);
  const p2 = perp(a12, u * 3.4);

  return (
    <svg
      ref={ref}
      viewBox={`${-extent} ${-extent} ${2 * extent} ${2 * extent}`}
      className={cn("block h-full w-full select-none", onPickTarget && "cursor-crosshair", className)}
      role="img"
      aria-label={`${title}. Hand at x ${exact.effector.x.toFixed(3)} metres, y ${exact.effector.y.toFixed(3)} metres.`}
      onClick={onClick}
      data-testid="arm-svg"
      data-effector-x={exact.effector.x.toFixed(6)}
      data-effector-y={exact.effector.y.toFixed(6)}
      fontFamily="Figtree Variable, ui-sans-serif, system-ui, sans-serif"
    >
      <defs>
        <radialGradient id={`bg${uid}`} cx="50%" cy="45%" r="75%">
          <stop offset="0%" stopColor="#1d232a" />
          <stop offset="100%" stopColor="#111418" />
        </radialGradient>
        <linearGradient id={`l1${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5f9bff" />
          <stop offset="45%" stopColor="#1f6fff" />
          <stop offset="100%" stopColor="#0a3fa8" />
        </linearGradient>
        <linearGradient id={`l2${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a9c9ff" />
          <stop offset="45%" stopColor="#6ea8ff" />
          <stop offset="100%" stopColor="#3a6fc2" />
        </linearGradient>
        <radialGradient id={`jh${uid}`} cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#6b7783" />
          <stop offset="60%" stopColor="#38424c" />
          <stop offset="100%" stopColor="#1c2228" />
        </radialGradient>
        <linearGradient id={`base${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4a5560" />
          <stop offset="100%" stopColor="#232a31" />
        </linearGradient>
        <filter id={`sh${uid}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx={u * 0.5} dy={-u * 0.7} stdDeviation={u * 0.6} floodColor="#000" floodOpacity="0.55" />
        </filter>
      </defs>

      <rect x={-extent} y={-extent} width={2 * extent} height={2 * extent} fill={`url(#bg${uid})`} />

      <g transform="scale(1,-1)">
        {ticks.map((v) => (
          <g key={v}>
            <line x1={v} x2={v} y1={-extent} y2={extent} stroke={v === 0 ? "#46515c" : "#232a31"} strokeWidth={u * (v === 0 ? 0.22 : 0.12)} />
            <line y1={v} y2={v} x1={-extent} x2={extent} stroke={v === 0 ? "#46515c" : "#232a31"} strokeWidth={u * (v === 0 ? 0.22 : 0.12)} />
          </g>
        ))}

        <path d={annulus} fill="rgba(110,168,255,0.07)" fillRule="evenodd" stroke="rgba(110,168,255,0.45)" strokeWidth={u * 0.16} strokeDasharray={`${u * 0.9} ${u * 0.7}`} />

        {annotate && (
          <g stroke="#e8a33d" strokeWidth={u * 0.18} strokeDasharray={`${u * 0.7} ${u * 0.5}`} opacity={0.9}>
            <line x1={s.effector.x} y1={s.effector.y} x2={s.effector.x} y2={0} />
            <line x1={s.effector.x} y1={s.effector.y} x2={0} y2={s.effector.y} />
          </g>
        )}

        {ghosts.map((g) => {
          const gs = fk(g);
          return (
            <g key={g.label} opacity={0.45}>
              <polyline
                points={`0,0 ${gs.elbow.x},${gs.elbow.y} ${gs.effector.x},${gs.effector.y}`}
                fill="none"
                stroke="#c3cbd4"
                strokeWidth={u * 1.6}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx={gs.effector.x} cy={gs.effector.y} r={u * 1.1} fill="#c3cbd4" />
            </g>
          );
        })}

        {target && (
          <g data-testid="arm-target">
            {annotate && <line x1={s.effector.x} y1={s.effector.y} x2={target.x} y2={target.y} stroke="#e8a33d" strokeWidth={u * 0.15} strokeDasharray={`${u * 0.3} ${u * 0.4}`} />}
            <circle cx={target.x} cy={target.y} r={u * 1.6} fill="rgba(232,163,61,0.15)" stroke="#e8a33d" strokeWidth={u * 0.3} />
            <circle cx={target.x} cy={target.y} r={u * 0.45} fill="#e8a33d" />
          </g>
        )}

        {annotate && (
          <g fill="none" strokeWidth={u * 0.25}>
            {/* θ1: from the +x axis to link 1 */}
            <line x1={0} y1={0} x2={r1 * 1.35} y2={0} stroke="#e6ebf0" strokeWidth={u * 0.15} strokeDasharray={`${u * 0.5} ${u * 0.4}`} />
            <path d={arc(0, 0, r1, 0, a1)} stroke="#e6ebf0" />
            {/* θ2: from link 1's extension to link 2 */}
            <line x1={s.elbow.x} y1={s.elbow.y} x2={elbowExt.x} y2={elbowExt.y} stroke="#e6ebf0" strokeWidth={u * 0.15} strokeDasharray={`${u * 0.5} ${u * 0.4}`} />
            <path d={arc(s.elbow.x, s.elbow.y, r2, a1, a12)} stroke="#e6ebf0" />
          </g>
        )}

        {/* Base mount */}
        <g filter={`url(#sh${uid})`}>
          <path d={`M ${-u * 4.2} ${-u * 3.4} L ${u * 4.2} ${-u * 3.4} L ${u * 2.6} ${-u * 0.6} L ${-u * 2.6} ${-u * 0.6} Z`} fill={`url(#base${uid})`} stroke="#0b0e12" strokeWidth={u * 0.15} />
          <rect x={-u * 5.4} y={-u * 4.2} width={u * 10.8} height={u * 0.9} rx={u * 0.3} fill="#2b323a" stroke="#0b0e12" strokeWidth={u * 0.12} />
          <circle cx={-u * 4.3} cy={-u * 3.75} r={u * 0.25} fill="#9aa6b2" />
          <circle cx={u * 4.3} cy={-u * 3.75} r={u * 0.25} fill="#9aa6b2" />
        </g>

        {/* Arm (exact FK of the tweened joint angles) */}
        <g filter={`url(#sh${uid})`}>
          <LinkBar from={s.base} angle={a1} length={shown.L1} width={linkW1} gradId={`l1${uid}`} edge="#06245f" />
          <LinkBar from={s.elbow} angle={a12} length={shown.L2} width={linkW2} gradId={`l2${uid}`} edge="#1d3d70" />
          <Gripper at={s.effector} angle={a12} size={u * 3} />
          <Joint x={0} y={0} r={u * 2.8} housingId={`jh${uid}`} />
          <Joint x={s.elbow.x} y={s.elbow.y} r={u * 2.3} housingId={`jh${uid}`} />
          <circle cx={s.effector.x} cy={s.effector.y} r={u * 0.55} fill="#e8a33d" stroke="#0b0e12" strokeWidth={u * 0.12} />
        </g>
      </g>

      {/* Axis tick labels in metres */}
      {annotate &&
        ticks
          .filter((v) => v !== 0 && Math.abs(v) < extent * 0.93)
          .map((v) => (
            <g key={`t${v}`} fill="#6c7884" fontSize={fs * 0.78} style={{ fontVariantNumeric: "tabular-nums" }}>
              <text x={v} y={fs * 1.05} textAnchor="middle">{`${+v.toFixed(2)}`}</text>
              <text x={-fs * 0.45} y={-v + fs * 0.3} textAnchor="end">{`${+v.toFixed(2)}`}</text>
            </g>
          ))}
      {annotate && (
        <g fill="#8b98a5" fontSize={fs * 0.9} fontWeight={600}>
          <text x={extent - fs * 0.6} y={-fs * 0.5} textAnchor="end">x (m)</text>
          <text x={fs * 0.5} y={-extent + fs * 1.4}>y (m)</text>
        </g>
      )}

      {ghosts.map((g) => {
        const gs = fk(g);
        return <Label key={g.label} x={gs.effector.x + u * 2} y={gs.effector.y + u * 2} text={`Pinned ${g.label}`} color="#c3cbd4" anchor="start" />;
      })}

      {annotate && (
        <>
          <Label x={(r1 + u * 2.4) * Math.cos(midA1 * DEG)} y={(r1 + u * 2.4) * Math.sin(midA1 * DEG)} text={`θ₁ ${Math.round(shown.theta1)}°`} testId="label-theta1" />
          <Label
            x={s.elbow.x + (r2 + u * 2.4) * Math.cos(midA2 * DEG)}
            y={s.elbow.y + (r2 + u * 2.4) * Math.sin(midA2 * DEG)}
            text={`θ₂ ${Math.round(shown.theta2)}°`}
            testId="label-theta2"
          />
          <Label x={mid1.x + p1.x} y={mid1.y + p1.y} text={`L₁ ${shown.L1.toFixed(2)} m`} color="#9cc1ff" />
          <Label x={mid2.x + p2.x} y={mid2.y + p2.y} text={`L₂ ${shown.L2.toFixed(2)} m`} color="#c8dcff" />
          <Label x={s.effector.x} y={-fs * 1.6} text={`x = ${fmt(s.effector.x)}`} color="#e8a33d" testId="label-x" />
          <Label x={fs * 0.6} y={s.effector.y} text={`y = ${fmt(s.effector.y)}`} color="#e8a33d" anchor="start" testId="label-y" />
          <Label
            x={s.effector.x + Math.cos(a12 * DEG) * u * 5.5}
            y={s.effector.y + Math.sin(a12 * DEG) * u * 5.5 + (Math.sin(a12 * DEG) < 0 ? -u * 1.5 : u * 0.5)}
            text={`Hand (${fmt(s.effector.x)}, ${fmt(s.effector.y)}) m`}
            color="#ffffff"
            anchor={Math.cos(a12 * DEG) >= 0 ? "start" : "end"}
            testId="label-hand"
          />
          <Label x={0} y={-s.maxReach - fs * 1.2} text={`Reachable area: ${s.minReach.toFixed(2)}–${s.maxReach.toFixed(2)} m from base`} color="#8fb6f5" size={fs * 0.85} />
          {target && (
            <Label x={target.x} y={target.y - u * 3.6} text={targetReachable ? "Target" : "Target (out of reach)"} color="#e8a33d" />
          )}
        </>
      )}
    </svg>
  );
});
