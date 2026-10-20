import type { Dimension } from "./units";
import { ROBOT_ARM_MODEL, ARM_DEFAULTS, ARM_LIMITS } from "./robot-arm";
import { BATTERY_MODEL, BATTERY_DEFAULTS } from "./battery";
import { QUEUE_MODEL, QUEUE_DEFAULTS } from "./queue";

export const TEMPLATE_IDS = ["robot-arm", "battery-fade", "queue-mm1"] as const;
export type TemplateId = (typeof TEMPLATE_IDS)[number];
export type CandidateTemplate = TemplateId | "unsupported";

export interface ParamDef {
  key: string;
  symbol: string; // KaTeX
  label: string;
  dimension: Dimension;
  unit: string;
  min: number;
  max: number;
  step: number;
  default: number;
  help: string;
  /** Words that, near a number, suggest this parameter in source text. */
  cues: string[];
}

export interface TemplateDef {
  id: TemplateId;
  name: string;
  short: string;
  modelId: string;
  version: string;
  equations: string[];
  assumptions: readonly string[];
  params: ParamDef[];
  /** Keyword cues used by the offline classifier. */
  keywords: string[];
  /** Phrases that mean the paper's model is richer than our template. */
  mismatchCues: { cue: RegExp; reason: string }[];
}

export const TEMPLATES: Record<TemplateId, TemplateDef> = {
  "robot-arm": {
    id: "robot-arm",
    name: "Two-link planar arm",
    short: "Forward kinematics of a 2-joint arm",
    modelId: ROBOT_ARM_MODEL.id,
    version: ROBOT_ARM_MODEL.version,
    equations: [...ROBOT_ARM_MODEL.equations],
    assumptions: ROBOT_ARM_MODEL.assumptions,
    params: [
      { key: "L1", symbol: "L_1", label: "Link 1 length", dimension: "length", unit: "m", min: 0.1, max: 3, step: 0.01, default: ARM_DEFAULTS.L1, help: "Shoulder-to-elbow length.", cues: ["l1", "l_1", "link 1", "first link", "upper arm", "link length"] },
      { key: "L2", symbol: "L_2", label: "Link 2 length", dimension: "length", unit: "m", min: 0.1, max: 3, step: 0.01, default: ARM_DEFAULTS.L2, help: "Elbow-to-end-effector length.", cues: ["l2", "l_2", "link 2", "second link", "forearm"] },
      { key: "theta1", symbol: "\\theta_1", label: "Shoulder angle", dimension: "angle", unit: "deg", min: ARM_LIMITS.minAngle, max: ARM_LIMITS.maxAngle, step: 1, default: ARM_DEFAULTS.theta1, help: "Angle of link 1 from the +x axis.", cues: ["θ1", "theta1", "theta_1", "θ_1", "shoulder"] },
      { key: "theta2", symbol: "\\theta_2", label: "Elbow angle", dimension: "angle", unit: "deg", min: ARM_LIMITS.minAngle, max: ARM_LIMITS.maxAngle, step: 1, default: ARM_DEFAULTS.theta2, help: "Angle of link 2 relative to link 1.", cues: ["θ2", "theta2", "theta_2", "θ_2", "elbow"] },
      { key: "targetX", symbol: "x_t", label: "Target x", dimension: "length", unit: "m", min: -6, max: 6, step: 0.01, default: 0.6, help: "Optional target point to compare against.", cues: ["target x", "x_t", "xt"] },
      { key: "targetY", symbol: "y_t", label: "Target y", dimension: "length", unit: "m", min: -6, max: 6, step: 0.01, default: 1.2, help: "Optional target point to compare against.", cues: ["target y", "y_t", "yt"] },
    ],
    keywords: ["forward kinematics", "inverse kinematics", "end-effector", "end effector", "joint angle", "link length", "manipulator", "robot arm", "robotic arm", "two-link", "2-link", "planar arm", "revolute", "workspace"],
    mismatchCues: [
      { cue: /\b(three|3)[- ]link\b|\bsix[- ]axis\b|\b6[- ]dof\b|\b7[- ]dof\b|spatial manipulator/i, reason: "The source describes an arm with more than two links or out-of-plane motion; the template only covers a 2-link planar arm." },
      { cue: /\btorque\b|\bdynamics\b|lagrang|inertia/i, reason: "The source involves arm dynamics (torques, inertia); the template is kinematics only." },
    ],
  },
  "battery-fade": {
    id: "battery-fade",
    name: "Battery capacity fade",
    short: "Capacity vs. cycle with an 80% threshold",
    modelId: BATTERY_MODEL.id,
    version: BATTERY_MODEL.version,
    equations: [BATTERY_MODEL.equations.geometric, BATTERY_MODEL.equations.linear],
    assumptions: BATTERY_MODEL.assumptions,
    params: [
      { key: "Q0", symbol: "Q_0", label: "Initial capacity", dimension: "capacity", unit: "Ah", min: 0.1, max: 100, step: 0.1, default: BATTERY_DEFAULTS.Q0, help: "Capacity at cycle 0.", cues: ["q0", "q_0", "initial capacity", "nominal capacity", "rated capacity", "beginning-of-life"] },
      { key: "d", symbol: "d", label: "Fade per cycle", dimension: "fraction", unit: "per cycle", min: 0, max: 0.01, step: 0.00005, default: BATTERY_DEFAULTS.d, help: "Fraction of remaining capacity lost each cycle (geometric mode).", cues: ["fade rate", "per cycle", "per-cycle", "degradation rate", "capacity loss per cycle", " d "] },
      { key: "k", symbol: "k", label: "Linear loss", dimension: "dimensionless", unit: "Ah/cycle", min: 0, max: 0.05, step: 0.0001, default: BATTERY_DEFAULTS.k, help: "Ah lost per cycle (linear mode only).", cues: ["ah per cycle", "ah/cycle", "linear fade", "slope"] },
      { key: "nMax", symbol: "n_{max}", label: "Cycles to simulate", dimension: "count", unit: "cycles", min: 10, max: 5000, step: 10, default: BATTERY_DEFAULTS.nMax, help: "Upper limit of the x-axis.", cues: ["cycles", "cycle life", "cycled"] },
      { key: "tempFactor", symbol: "f_T", label: "Temperature factor", dimension: "dimensionless", unit: "×", min: 0.5, max: 3, step: 0.05, default: BATTERY_DEFAULTS.tempFactor, help: "Assumption: illustrative multiplier on fade rate. Not a physical temperature law.", cues: ["temperature factor"] },
    ],
    keywords: ["capacity fade", "capacity retention", "state of health", "soh", "cycle life", "lithium-ion", "li-ion", "battery", "degradation", "cycling", "ah", "end of life", "80%"],
    mismatchCues: [
      { cue: /square[- ]root|\bsqrt\b|√|power[- ]law|n\^0\.5|t\^0\.5|\bsei\b|arrhenius|\bknee\b|nonlinear (degradation|fade)|non-linear (degradation|fade)|semi-empirical/i, reason: "The source uses a nonlinear or mechanistic degradation model; the template's geometric/linear fade is a simplified conceptual stand-in." },
    ],
  },
  "queue-mm1": {
    id: "queue-mm1",
    name: "Queueing & inference throughput",
    short: "M/M/1 latency vs. load",
    modelId: QUEUE_MODEL.id,
    version: QUEUE_MODEL.version,
    equations: [QUEUE_MODEL.equations.rho, QUEUE_MODEL.equations.W, QUEUE_MODEL.equations.Wq],
    assumptions: QUEUE_MODEL.assumptions,
    params: [
      { key: "lambda", symbol: "\\lambda", label: "Arrival rate", dimension: "rate", unit: "req/s", min: 0, max: 100, step: 0.1, default: QUEUE_DEFAULTS.lambda, help: "Average requests arriving per second.", cues: ["λ", "lambda", "arrival rate", "arrivals", "request rate", "offered load"] },
      { key: "mu", symbol: "\\mu", label: "Service rate", dimension: "rate", unit: "req/s", min: 0.1, max: 100, step: 0.1, default: QUEUE_DEFAULTS.mu, help: "Requests one server completes per second.", cues: ["μ", "mu", "service rate", "throughput capacity", "processing rate", "served"] },
    ],
    keywords: ["queue", "queueing", "queuing", "arrival rate", "service rate", "utilization", "utilisation", "m/m/1", "latency", "throughput", "little's law", "poisson", "waiting time", "inference server"],
    mismatchCues: [
      { cue: /m\/g\/1|m\/m\/c|m\/m\/k|g\/g\/1|multi[- ]server|multiple servers|\bbatching\b|priority queue|heavy[- ]tailed/i, reason: "The source analyses a different queue (multi-server, general service, batching or priorities); the template is a single-server M/M/1 approximation." },
    ],
  },
};

export function getTemplate(id: string): TemplateDef | null {
  return (TEMPLATES as Record<string, TemplateDef>)[id] ?? null;
}

export function defaultParams(id: TemplateId): Record<string, number> {
  return Object.fromEntries(TEMPLATES[id].params.map((p) => [p.key, p.default]));
}
