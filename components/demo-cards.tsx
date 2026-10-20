import Link from "next/link";
import { fadeCurve, BATTERY_DEFAULTS } from "@/lib/models/battery";
import { latencyCurve, QUEUE_DEFAULTS } from "@/lib/models/queue";
import { ARM_DEFAULTS } from "@/lib/models/robot-arm";
import { RobotArm } from "./robot-arm";

// Thumbnails are computed from the same models as the studio, at the demo defaults.

function ArmThumb() {
  return <RobotArm {...ARM_DEFAULTS} target={null} annotate={false} title="Two-link robot arm preview" />;
}

function BatteryThumb() {
  const c = fadeCurve(BATTERY_DEFAULTS, 60);
  const pts = c.map((p) => `${(p.cycle / BATTERY_DEFAULTS.nMax) * 100},${100 - p.retention * 90}`).join(" ");
  return (
    <svg viewBox="-4 -4 108 108" className="h-full w-full" aria-hidden>
      <line x1={0} x2={100} y1={100 - 0.8 * 90} y2={100 - 0.8 * 90} stroke="#e5484d" strokeDasharray="3 3" strokeWidth={0.8} />
      <polyline points={pts} fill="none" stroke="#6ea8ff" strokeWidth={2.2} strokeLinejoin="round" />
    </svg>
  );
}

function QueueThumb() {
  const mu = QUEUE_DEFAULTS.mu;
  const c = latencyCurve(mu, mu, 80).filter((p) => p.W !== null);
  const cap = 12 / mu;
  const pts = c.map((p) => `${(p.lambda / (mu * 1.1)) * 100},${100 - Math.min(p.W! / cap, 1) * 95}`).join(" ");
  return (
    <svg viewBox="-4 -4 108 108" className="h-full w-full" aria-hidden>
      <line x1={100 / 1.1} x2={100 / 1.1} y1={0} y2={100} stroke="#e5484d" strokeDasharray="3 3" strokeWidth={0.8} />
      <polyline points={pts} fill="none" stroke="#6ea8ff" strokeWidth={2.2} strokeLinejoin="round" />
    </svg>
  );
}

const DEMOS = [
  { id: "demo-arm", title: "Two-link robot arm", body: "Forward kinematics. Bend the elbow and watch x and y follow the trig.", Thumb: ArmThumb },
  { id: "demo-battery", title: "Battery capacity fade", body: "Geometric fade per cycle, an 80% end-of-life line, and cycles-to-threshold.", Thumb: BatteryThumb },
  { id: "demo-queue", title: "Inference queue", body: "M/M/1 latency. Push arrivals toward the service rate and see the wall.", Thumb: QueueThumb },
];

export function DemoCards() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {DEMOS.map(({ id, title, body, Thumb }) => (
        <Link
          key={id}
          href={`/playground/${id}`}
          className="group flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-paper transition-colors hover:border-signal"
          data-testid={`demo-card-${id}`}
        >
          <div className="aspect-[4/3] overflow-hidden bg-studio [&>svg]:p-6 [&>svg[data-testid=arm-svg]]:p-0">
            <Thumb />
          </div>
          <div className="flex flex-1 flex-col gap-1 p-5">
            <h3 className="text-lg font-semibold group-hover:text-signal">{title}</h3>
            <p className="text-sm leading-relaxed text-slate">{body}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
