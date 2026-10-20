"use client";
import { useEffect, useRef, useState } from "react";
import { Info, RotateCcw } from "lucide-react";
import { Slider } from "./ui/slider";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { Math as TeX } from "./math";
import { ProvenanceChip } from "./provenance-chip";
import type { ParamDef } from "@/lib/models/templates";
import type { ParamState } from "@/lib/experiment";
import { cn, revealInPanel } from "@/lib/utils";

interface RowProps {
  def: ParamDef;
  state: ParamState;
  error: string | null;
  active: boolean;
  onChange: (v: number) => void;
  onReset: () => void;
  onFocusEvidence: () => void;
}

function decimals(step: number) {
  const s = String(step);
  return s.includes("e-") ? Number(s.split("e-")[1]) : (s.split(".")[1]?.length ?? 0);
}

function ParamRow({ def, state, error, active, onChange, onReset, onFocusEvidence }: RowProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState(String(state.value));
  useEffect(() => setDraft(String(Number(state.value.toFixed(decimals(def.step) + 2)))), [state.value, def.step]);
  useEffect(() => {
    if (active && ref.current) revealInPanel(ref.current, "nearest");
  }, [active]);

  const canReset = state.provenance === "user";
  return (
    <div
      ref={ref}
      className={cn("rounded-2xl p-3 transition-colors", active ? "bg-signal/10 ring-1 ring-signal/60" : "hover:bg-studio-raised")}
      data-testid={`control-${def.key}`}
      data-active={active}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-studio-text">
            {def.label} <TeX tex={def.symbol} className="text-studio-muted" />
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="text-studio-muted hover:text-studio-text" aria-label={`About ${def.label}`}>
                  <Info className="size-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                {def.help} Range {def.min} to {def.max} {def.unit}.
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {state.evidence ? (
              <button onClick={onFocusEvidence} className="rounded-full" aria-label={`Show source for ${def.label}`} data-testid={`evidence-link-${def.key}`}>
                <ProvenanceChip provenance={state.provenance} page={state.evidence.page} />
              </button>
            ) : (
              <ProvenanceChip provenance={state.provenance} />
            )}
            {state.provenance === "user" && state.paperValue !== undefined && (
              <span className="tabular text-[11px] text-studio-muted">
                paper: {state.paperValue} {def.unit}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <input
            type="number"
            value={draft}
            step={def.step}
            min={def.min}
            max={def.max}
            onChange={(e) => {
              setDraft(e.target.value);
              const n = Number(e.target.value);
              if (e.target.value.trim() !== "" && Number.isFinite(n)) onChange(n);
            }}
            className={cn(
              "tabular h-8 w-[5.5rem] rounded-lg border bg-studio px-2 text-right text-sm text-studio-text outline-none focus:border-signal",
              error ? "border-danger" : "border-studio-line",
            )}
            aria-label={`${def.label} in ${def.unit}`}
            aria-invalid={!!error}
            data-testid={`input-${def.key}`}
          />
          <span className="w-12 text-xs text-studio-muted">{def.unit}</span>
        </div>
      </div>
      <Slider
        className="mt-3"
        min={def.min}
        max={def.max}
        step={def.step}
        value={[Math.min(def.max, Math.max(def.min, state.value))]}
        onValueChange={([v]) => onChange(Number(v.toFixed(decimals(def.step))))}
        thumbLabel={def.label}
        data-testid={`slider-${def.key}`}
      />
      <div className="mt-1 flex items-center justify-between">
        {error ? <span className="text-xs text-danger" role="alert">{error}</span> : <span />}
        {canReset && (
          <button onClick={onReset} className="flex items-center gap-1 text-xs text-studio-muted hover:text-studio-text">
            <RotateCcw className="size-3" /> {state.paperValue !== undefined ? "Back to paper value" : "Back to default"}
          </button>
        )}
      </div>
    </div>
  );
}

export function ParameterControls({
  defs,
  params,
  errors,
  activeKey,
  onChange,
  onReset,
  onFocusEvidence,
  hidden = [],
}: {
  defs: ParamDef[];
  params: Record<string, ParamState>;
  errors: Record<string, string>;
  activeKey: string | null;
  onChange: (key: string, v: number) => void;
  onReset: (key: string) => void;
  onFocusEvidence: (key: string) => void;
  hidden?: string[];
}) {
  return (
    <div className="space-y-1">
      {defs
        .filter((d) => !hidden.includes(d.key))
        .map((d) => (
          <ParamRow
            key={d.key}
            def={d}
            state={params[d.key]}
            error={errors[d.key] ?? null}
            active={activeKey === d.key}
            onChange={(v) => onChange(d.key, v)}
            onReset={() => onReset(d.key)}
            onFocusEvidence={() => onFocusEvidence(d.key)}
          />
        ))}
    </div>
  );
}
