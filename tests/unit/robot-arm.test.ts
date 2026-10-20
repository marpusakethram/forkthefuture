import { describe, expect, it } from "vitest";
import { forwardKinematics, ArmInputError } from "@/lib/models/robot-arm";

const close = (a: number, b: number) => expect(a).toBeCloseTo(b, 10);

describe("two-link forward kinematics", () => {
  it("θ1=0, θ2=0 puts the effector at (L1+L2, 0)", () => {
    const s = forwardKinematics({ L1: 0.5, L2: 0.3, theta1: 0, theta2: 0 });
    close(s.effector.x, 0.8);
    close(s.effector.y, 0);
  });

  it("θ1=90°, θ2=0 puts the effector at (0, L1+L2)", () => {
    const s = forwardKinematics({ L1: 0.5, L2: 0.3, theta1: 90, theta2: 0 });
    close(s.effector.x, 0);
    close(s.effector.y, 0.8);
  });

  it("computes the elbow from θ1 only (degrees converted to radians)", () => {
    const s = forwardKinematics({ L1: 2, L2: 1, theta1: 60, theta2: 77 });
    close(s.elbow.x, 2 * Math.cos(Math.PI / 3));
    close(s.elbow.y, 2 * Math.sin(Math.PI / 3));
  });

  it("matches the hand-calculated handout pose (L1=0.5, L2=0.3, θ1=30°, θ2=45°)", () => {
    const s = forwardKinematics({ L1: 0.5, L2: 0.3, theta1: 30, theta2: 45 });
    // x = 0.5·cos30° + 0.3·cos75° = 0.433013 + 0.077646
    expect(s.effector.x).toBeCloseTo(0.510658, 5);
    // y = 0.5·sin30° + 0.3·sin75° = 0.25 + 0.289778
    expect(s.effector.y).toBeCloseTo(0.539778, 5);
  });

  it("folding the elbow back (θ2=180°) reaches |L1−L2|", () => {
    const s = forwardKinematics({ L1: 1, L2: 0.4, theta1: 20, theta2: 180 });
    close(s.reach, 0.6);
    close(s.minReach, 0.6);
    close(s.maxReach, 1.4);
  });

  it("reports target distance and reachability", () => {
    const s = forwardKinematics({ L1: 1, L2: 1, theta1: 0, theta2: 0, target: { x: 2, y: 1 } });
    close(s.targetDistance!, 1);
    expect(s.targetReachable).toBe(false);
  });

  it.each([
    [{ L1: 0, L2: 1, theta1: 0, theta2: 0 }],
    [{ L1: -1, L2: 1, theta1: 0, theta2: 0 }],
    [{ L1: 1, L2: Number.NaN, theta1: 0, theta2: 0 }],
    [{ L1: 1, L2: 1, theta1: 181, theta2: 0 }],
  ])("rejects invalid input %j", (input) => {
    expect(() => forwardKinematics(input)).toThrow(ArmInputError);
  });
});
