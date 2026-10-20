export const QUEUE_MODEL = {
  id: "queue-mm1",
  name: "M/M/1 queue — steady-state latency",
  version: "1.0.0",
  equations: {
    rho: String.raw`\rho = \lambda / \mu`,
    W: String.raw`W = \dfrac{1}{\mu - \lambda}`,
    Wq: String.raw`W_q = \dfrac{\lambda}{\mu(\mu - \lambda)}`,
  },
  assumptions: [
    "Poisson arrivals (exponential inter-arrival times) at rate λ.",
    "Exponential service times at rate μ, one server, first-come-first-served, infinite buffer.",
    "Steady state only — the formulas are meaningless when λ ≥ μ (the queue grows without bound).",
  ],
} as const;

export interface QueueInput {
  lambda: number; // requests / second
  mu: number; // requests / second
}

export type QueueResult =
  | { stable: true; rho: number; W: number; Wq: number; L: number; Lq: number }
  | { stable: false; rho: number; reason: string };

export class QueueInputError extends Error {}

export function validateQueue(q: QueueInput): void {
  if (!Number.isFinite(q.lambda) || q.lambda < 0) throw new QueueInputError("λ must be ≥ 0 requests/s");
  if (!Number.isFinite(q.mu) || q.mu <= 0) throw new QueueInputError("μ must be > 0 requests/s");
}

/** M/M/1 analytics. Never returns a finite waiting time for an unstable queue. */
export function mm1(q: QueueInput): QueueResult {
  validateQueue(q);
  const rho = q.lambda / q.mu;
  if (q.lambda >= q.mu) {
    return { stable: false, rho, reason: "λ ≥ μ: arrivals outpace service, so there is no steady state and the queue grows without bound." };
  }
  const W = 1 / (q.mu - q.lambda); // seconds in system
  const Wq = q.lambda / (q.mu * (q.mu - q.lambda)); // seconds waiting
  return { stable: true, rho, W, Wq, L: q.lambda * W, Lq: q.lambda * Wq };
}

export interface LatencyPoint {
  lambda: number;
  W: number | null; // null where unstable
  Wq: number | null;
}

/** Latency vs arrival rate from 0 to `upTo` (defaults just past μ to show the cliff). */
export function latencyCurve(mu: number, upTo = mu * 1.15, points = 160): LatencyPoint[] {
  validateQueue({ lambda: 0, mu });
  const out: LatencyPoint[] = [];
  for (let i = 0; i <= points; i++) {
    const lambda = (upTo * i) / points;
    const r = mm1({ lambda, mu });
    out.push(r.stable ? { lambda, W: r.W, Wq: r.Wq } : { lambda, W: null, Wq: null });
  }
  return out;
}

export const QUEUE_DEFAULTS: QueueInput = { lambda: 7, mu: 10 };
