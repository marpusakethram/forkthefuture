"use client";
import { CartesianGrid, Line, LineChart, ReferenceArea, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { latencyCurve, mm1, type QueueInput } from "@/lib/models/queue";

export function QueueChart({ current, baselines = [] }: { current: QueueInput; baselines?: { label: string; input: QueueInput }[] }) {
  const mu = current.mu;
  const xMax = Math.max(mu * 1.2, current.lambda * 1.05, ...baselines.map((b) => b.input.lambda * 1.05));
  const yCap = (20 / mu) * 1000; // ms: 20× the no-load latency keeps the knee visible
  const data = latencyCurve(mu, xMax, 240).map((p) => ({ lambda: p.lambda, W: p.W === null ? null : Math.min(p.W * 1000, yCap * 1.5), Wq: p.Wq === null ? null : Math.min(p.Wq * 1000, yCap * 1.5) }));
  const r = mm1(current);
  const ms = (s: number) => (s * 1000 >= 100 ? `${Math.round(s * 1000)} ms` : `${(s * 1000).toFixed(1)} ms`);

  return (
    <div className="flex h-full w-full flex-col" data-testid="queue-chart" data-stable={String(r.stable)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-3 pt-2">
        <p className="text-[15px] font-semibold text-studio-text">How long each request takes as traffic grows</p>
        <div className="flex flex-wrap gap-3 text-xs text-studio-muted">
          <span className="flex items-center gap-1.5"><span className="inline-block h-0.5 w-5 bg-trace" />Total time (wait + service)</span>
          <span className="flex items-center gap-1.5"><span className="inline-block w-5 border-t-2 border-dashed border-[#c3cbd4]" />Time spent waiting in line</span>
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 24, right: 28, bottom: 30, left: 10 }}>
            <CartesianGrid stroke="#232a31" />
            <ReferenceArea x1={0} x2={mu * 0.7} fill="#2fa36b" fillOpacity={0.06} label={{ value: "Relaxed", position: "insideTop", fill: "#5fcf95", fontSize: 12, fontWeight: 600 }} />
            <ReferenceArea x1={mu * 0.7} x2={mu * 0.9} fill="#e8a33d" fillOpacity={0.07} label={{ value: "Getting slow", position: "insideTop", fill: "#e8a33d", fontSize: 12, fontWeight: 600 }} />
            <ReferenceArea x1={mu * 0.9} x2={mu} fill="#e5484d" fillOpacity={0.08} />
            <ReferenceArea x1={mu} x2={xMax} fill="#e5484d" fillOpacity={0.16} label={{ value: "Overloaded", position: "insideTop", fill: "#ff8a8f", fontSize: 12, fontWeight: 600 }} />
            <XAxis
              type="number"
              dataKey="lambda"
              domain={[0, xMax]}
              stroke="#6c7884"
              tick={{ fill: "#8b98a5", fontSize: 12 }}
              tickFormatter={(v) => v.toFixed(0)}
              label={{ value: "Requests arriving per second (λ)", position: "insideBottom", offset: -18, fill: "#8b98a5", fontSize: 12 }}
            />
            <YAxis
              type="number"
              domain={[0, yCap]}
              allowDataOverflow
              stroke="#6c7884"
              tick={{ fill: "#8b98a5", fontSize: 12 }}
              tickFormatter={(v) => `${Math.round(v)}`}
              label={{ value: "Average time per request (ms)", angle: -90, position: "insideLeft", offset: 14, fill: "#8b98a5", fontSize: 12, style: { textAnchor: "middle" } }}
            />
            <Tooltip
              contentStyle={{ background: "#1d2228", border: "1px solid #2b323a", borderRadius: 12, color: "#e6ebf0" }}
              labelFormatter={(l: number) => `${l.toFixed(2)} requests/s arriving`}
              formatter={(v, name) => [typeof v === "number" ? `${v.toFixed(1)} ms` : "overloaded", name === "W" ? "Total time" : "Waiting in line"]}
            />
            <ReferenceLine x={mu} stroke="#e5484d" strokeWidth={2} label={{ value: `Server max: ${mu} req/s`, position: "insideBottomRight", fill: "#ff8a8f", fontSize: 12, fontWeight: 700 }} />
            <Line name="W" dataKey="W" stroke="#6ea8ff" strokeWidth={3} dot={false} connectNulls={false} isAnimationActive={false} />
            <Line name="Wq" dataKey="Wq" stroke="#c3cbd4" strokeWidth={1.75} strokeDasharray="6 4" dot={false} connectNulls={false} isAnimationActive={false} />
            {r.stable && r.W * 1000 <= yCap && (
              <ReferenceDot
                x={current.lambda}
                y={r.W * 1000}
                r={8}
                fill="#6ea8ff"
                stroke="#ffffff"
                strokeWidth={2}
                label={{ value: `You are here: ${ms(r.W)} per request`, position: current.lambda > mu * 0.6 ? "left" : "top", offset: 14, fill: "#ffffff", fontSize: 13, fontWeight: 700 }}
              />
            )}
            {!r.stable && (
              <ReferenceDot x={Math.min(current.lambda, xMax)} y={yCap * 0.55} r={0} label={{ value: "You are here: overloaded, no finite wait", position: "left", fill: "#ffffff", fontSize: 13, fontWeight: 700 }} />
            )}
            {baselines.map((b) => {
              const br = mm1({ lambda: b.input.lambda, mu });
              return br.stable && br.W * 1000 <= yCap ? (
                <ReferenceDot key={b.label} x={b.input.lambda} y={br.W * 1000} r={6} fill="#15191e" stroke="#e8a33d" strokeWidth={2} label={{ value: `Pinned ${b.label}`, position: "bottom", offset: 10, fill: "#e8a33d", fontSize: 12, fontWeight: 600 }} />
              ) : null;
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function UtilizationMeter({ lambda, mu }: { lambda: number; mu: number }) {
  const rho = lambda / mu;
  const pct = Math.min(rho, 1.2) / 1.2;
  const tone = rho >= 1 ? "bg-danger" : rho >= 0.7 ? "bg-adjusted" : "bg-ok";
  const words = rho >= 1 ? "Overloaded — requests arrive faster than the server can finish them" : rho >= 0.9 ? "Near the wall — small traffic bumps cause big delays" : rho >= 0.7 ? "Busy — waiting time is climbing fast" : "Relaxed — most requests barely wait";
  return (
    <div className="w-full" data-testid="utilization-meter">
      <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <span className="text-studio-text">
          Server is busy <span className="tabular font-semibold">{Math.round(rho * 100)}%</span> of the time
        </span>
        <span className="text-studio-muted">{words}</span>
      </div>
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-studio-line" role="meter" aria-valuemin={0} aria-valuemax={1.2} aria-valuenow={Number(rho.toFixed(3))} aria-label="Utilization">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct * 100}%` }} />
        <div className="absolute inset-y-0 w-0.5 bg-white" style={{ left: `${(1 / 1.2) * 100}%` }} aria-hidden />
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-studio-muted">
        <span>0%</span>
        <span style={{ marginLeft: `${(1 / 1.2) * 100 - 8}%` }}>100% = server max</span>
        <span />
      </div>
    </div>
  );
}
