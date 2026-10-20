"use client";
import { CartesianGrid, Line, LineChart, ReferenceArea, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { capacityAt, cyclesToThreshold, fadeCurve, type BatteryInput } from "@/lib/models/battery";

export interface BatterySeries {
  label: string;
  input: BatteryInput;
}

const COLORS: Record<string, string> = { Current: "#6ea8ff", A: "#c3cbd4", B: "#e8a33d" };

export function BatteryChart({ current, baselines = [] }: { current: BatteryInput; baselines?: BatterySeries[] }) {
  let main: ReturnType<typeof fadeCurve> = [];
  let n80: number | null = null;
  try {
    main = fadeCurve(current);
    n80 = cyclesToThreshold(current);
  } catch {
    /* invalid input is reported by the parameter panel */
  }
  const series = [{ label: "Current", input: current, data: main, color: COLORS.Current }].concat(
    baselines.flatMap((b) => {
      try {
        return [{ label: `Pinned ${b.label}`, input: b.input, data: fadeCurve(b.input), color: COLORS[b.label] ?? "#c3cbd4" }];
      } catch {
        return [];
      }
    }),
  );
  const xMax = Math.max(...series.map((s) => s.input.nMax));
  const endPct = main.length ? (capacityAt(current, current.nMax) / current.Q0) * 100 : 0;
  const endAh = main.length ? capacityAt(current, current.nMax) : 0;

  return (
    <div className="flex h-full w-full flex-col" data-testid="battery-chart" data-n80={n80 ?? "none"}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-3 pt-2">
        <p className="text-[15px] font-semibold text-studio-text">How much charge the battery still holds, cycle after cycle</p>
        <div className="flex flex-wrap gap-3 text-xs text-studio-muted">
          {series.map((s) => (
            <span key={s.label} className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-5" style={{ background: s.color, borderTop: s.label === "Current" ? undefined : `2px dashed ${s.color}` }} />
              {s.label === "Current" ? "Your settings" : s.label}
            </span>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart margin={{ top: 24, right: 28, bottom: 30, left: 10 }}>
            <CartesianGrid stroke="#232a31" />
            <ReferenceArea y1={0} y2={80} fill="#e5484d" fillOpacity={0.07} ifOverflow="extendDomain" label={{ value: "Worn out zone — below 80% of original capacity", position: "insideBottomLeft", fill: "#e5848a", fontSize: 12 }} />
            <XAxis
              type="number"
              dataKey="cycle"
              domain={[0, xMax]}
              stroke="#6c7884"
              tick={{ fill: "#8b98a5", fontSize: 12 }}
              label={{ value: "Charge cycles (1 cycle = one full charge and discharge)", position: "insideBottom", offset: -18, fill: "#8b98a5", fontSize: 12 }}
            />
            <YAxis
              type="number"
              domain={[0, 100]}
              ticks={[0, 20, 40, 60, 80, 100]}
              stroke="#6c7884"
              tick={{ fill: "#8b98a5", fontSize: 12 }}
              tickFormatter={(v) => `${v}%`}
              label={{ value: "Capacity left (% of new)", angle: -90, position: "insideLeft", offset: 14, fill: "#8b98a5", fontSize: 12, style: { textAnchor: "middle" } }}
            />
            <Tooltip
              contentStyle={{ background: "#1d2228", border: "1px solid #2b323a", borderRadius: 12, color: "#e6ebf0" }}
              labelFormatter={(n) => `After ${n} cycles`}
              formatter={(v: number, name, item) => [`${v.toFixed(1)}% left (${(item.payload.capacity as number).toFixed(3)} Ah)`, name === "Current" ? "Your settings" : name]}
            />
            <ReferenceLine y={80} stroke="#e5484d" strokeDasharray="6 4" label={{ value: "80% = end of life", position: "insideTopRight", fill: "#ff8a8f", fontSize: 12, fontWeight: 600 }} />
            {series.map((s) => (
              <Line
                key={s.label}
                name={s.label}
                data={s.data.map((p) => ({ ...p, pct: p.retention * 100 }))}
                dataKey="pct"
                stroke={s.color}
                strokeWidth={s.label === "Current" ? 3 : 2}
                strokeDasharray={s.label === "Current" ? undefined : "7 5"}
                dot={false}
                isAnimationActive={false}
              />
            ))}
            {n80 !== null && (
              <ReferenceDot x={n80} y={80} r={7} fill="#e5484d" stroke="#15191e" strokeWidth={2} label={{ value: `Hits 80% at cycle ${n80}`, position: "top", offset: 12, fill: "#ffffff", fontSize: 13, fontWeight: 700 }} />
            )}
            {main.length > 0 && (
              <ReferenceDot
                x={current.nMax}
                y={endPct}
                r={6}
                fill="#6ea8ff"
                stroke="#15191e"
                strokeWidth={2}
                label={{ value: `${endPct.toFixed(0)}% left (${endAh.toFixed(2)} Ah)`, position: endPct > 85 ? "insideBottomLeft" : "left", offset: 12, fill: "#cfe0ff", fontSize: 12, fontWeight: 600 }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
