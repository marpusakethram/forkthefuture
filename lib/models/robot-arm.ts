import { degToRad } from "./units";

export const ROBOT_ARM_MODEL = {
  id: "robot-arm-2link",
  name: "Two-link planar arm — forward kinematics",
  version: "1.0.0",
  equations: [
    String.raw`x = L_1\cos\theta_1 + L_2\cos(\theta_1+\theta_2)`,
    String.raw`y = L_1\sin\theta_1 + L_2\sin(\theta_1+\theta_2)`,
  ],
  assumptions: [
    "Rigid links, revolute joints, planar motion only.",
    "Pure geometry: no masses, torques, joint limits or dynamics.",
    "Angles are measured counter-clockwise; θ2 is relative to link 1.",
  ],
} as const;

export const ARM_LIMITS = { minLength: 0.01, maxLength: 10, minAngle: -180, maxAngle: 180 };

export interface ArmInput {
  L1: number; // metres
  L2: number; // metres
  theta1: number; // degrees
  theta2: number; // degrees
  target?: { x: number; y: number } | null;
}

export interface ArmState {
  base: { x: number; y: number };
  elbow: { x: number; y: number };
  effector: { x: number; y: number };
  reach: number; // distance base -> effector
  minReach: number;
  maxReach: number;
  targetDistance: number | null;
  targetReachable: boolean | null;
}

export class ArmInputError extends Error {}

export function validateArm(input: ArmInput): void {
  const { L1, L2, theta1, theta2 } = input;
  for (const [k, v] of Object.entries({ L1, L2 })) {
    if (!Number.isFinite(v) || v <= 0) throw new ArmInputError(`${k} must be a positive length in metres`);
    if (v < ARM_LIMITS.minLength || v > ARM_LIMITS.maxLength)
      throw new ArmInputError(`${k} must be between ${ARM_LIMITS.minLength} and ${ARM_LIMITS.maxLength} m`);
  }
  for (const [k, v] of Object.entries({ theta1, theta2 })) {
    if (!Number.isFinite(v) || v < ARM_LIMITS.minAngle || v > ARM_LIMITS.maxAngle)
      throw new ArmInputError(`${k} must be between -180° and 180°`);
  }
}

/** Forward kinematics. Degrees in, metres out. */
export function forwardKinematics(input: ArmInput): ArmState {
  validateArm(input);
  const t1 = degToRad(input.theta1);
  const t12 = degToRad(input.theta1 + input.theta2);
  const elbow = { x: input.L1 * Math.cos(t1), y: input.L1 * Math.sin(t1) };
  const effector = {
    x: elbow.x + input.L2 * Math.cos(t12),
    y: elbow.y + input.L2 * Math.sin(t12),
  };
  const reach = Math.hypot(effector.x, effector.y);
  const minReach = Math.abs(input.L1 - input.L2);
  const maxReach = input.L1 + input.L2;
  let targetDistance: number | null = null;
  let targetReachable: boolean | null = null;
  if (input.target) {
    targetDistance = Math.hypot(effector.x - input.target.x, effector.y - input.target.y);
    const r = Math.hypot(input.target.x, input.target.y);
    targetReachable = r >= minReach - 1e-12 && r <= maxReach + 1e-12;
  }
  return { base: { x: 0, y: 0 }, elbow, effector, reach, minReach, maxReach, targetDistance, targetReachable };
}

export const ARM_DEFAULTS: ArmInput = { L1: 1.0, L2: 0.7, theta1: 35, theta2: 50, target: { x: 0.6, y: 1.2 } };
