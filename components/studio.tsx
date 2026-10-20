"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Download, FileJson, FileCode2, Image as ImageIcon, Link2, Pin, RotateCcw, X } from "lucide-react";
import { Button } from "./ui/button";
import { TooltipProvider } from "./ui/tooltip";
import { Math as TeX } from "./math";
import { RobotArm } from "./robot-arm";
import { BatteryChart } from "./battery-chart";
import { QueueChart, UtilizationMeter } from "./queue-chart";
import { ParameterControls } from "./parameter-controls";
import { PaperEvidence, type Highlight } from "./paper-evidence";
import { ProvenanceChip } from "./provenance-chip";
import { Logo } from "./site-nav";
import { demoExperiment, type Experiment, type ParamState } from "@/lib/experiment";
import { loadExperiment, saveExperiment } from "@/lib/store";
import { TEMPLATES } from "@/lib/models/templates";
import { checkParam } from "@/lib/models/validation";
import { batteryInput, outputs, type Values } from "@/lib/simulate";
import { buildScenario, attributionLine } from "@/lib/export/scenario";
import { buildStandaloneHtml } from "@/lib/export/standalone-html";
import { svgToPngBlob } from "@/lib/export/png";
import { downloadBlob, slug, cn } from "@/lib/utils";
import type { FadeMode } from "@/lib/models/battery";

interface PinSnap {
  label: "A" | "B";
  values: Values;
  options: Experiment["options"];
}

const valuesOf = (p: Record<string, ParamState>): Values => Object.fromEntries(Object.entries(p).map(([k, s]) => [k, s.value]));

export function Studio({ id }: { id: string }) {
  const [exp, setExp] = useState<Experiment | null | undefined>(undefined);
  const initial = useRef<Experiment | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [pins, setPins] = useState<PinSnap[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const vizRef = useRef<HTMLDivElement>(null);
  const lastValid = useRef<Values | null>(null);

  useEffect(() => {
    const e = demoExperiment(id) ?? loadExperiment(id);
    initial.current = e ? structuredClone(e) : null;
    setExp(e);
  }, [id]);

  useEffect(() => {
    if (exp && !exp.demo) saveExperiment(exp);
  }, [exp]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const setParam = useCallback((key: string, value: number) => {
    setExp((e) => {
      if (!e) return e;
      const prev = e.params[key];
      if (prev.value === value) return e;
      return { ...e, params: { ...e.params, [key]: { ...prev, value, provenance: "user" } } };
    });
  }, []);

  const resetParam = useCallback((key: string) => {
    setExp((e) => {
      if (!e || !initial.current) return e;
      return { ...e, params: { ...e.params, [key]: structuredClone(initial.current.params[key]) } };
    });
  }, []);

  const setOptions = (o: Partial<Experiment["options"]>) => setExp((e) => (e ? { ...e, options: { ...e.options, ...o } } : e));

  if (exp === undefined) return <div className="min-h-dvh bg-studio" />;
  if (exp === null)
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-studio px-6 text-center text-studio-text">
        <h1 className="text-3xl font-bold tracking-tight">This experiment isn’t on this device</h1>
        <p className="max-w-md text-studio-muted">Experiments built from your papers are stored in this browser only. Open a demo, or upload the paper again.</p>
        <div className="flex gap-2">
          <Button variant="studio-primary" asChild>
            <Link href="/#upload">Upload a paper</Link>
          </Button>
          <Button variant="studio" asChild>
            <Link href="/playground/demo-arm">Open the arm demo</Link>
          </Button>
        </div>
      </div>
    );

  const t = TEMPLATES[exp.template];
  const values = valuesOf(exp.params);
  const errors: Record<string, string> = {};
  for (const d of t.params) {
    const err = checkParam(exp.template, d.key, values[d.key]);
    if (err) errors[d.key] = err;
  }
  const valid = Object.keys(errors).length === 0;
  if (valid) lastValid.current = values;
  const drawn = lastValid.current ?? valuesOf(initial.current!.params);
  const outs = outputs(exp.template, values, exp.options);
  const hidden =
    exp.template === "battery-fade" ? [exp.options.fadeMode === "geometric" ? "k" : "d"] : exp.template === "robot-arm" && !exp.options.showTarget ? ["targetX", "targetY"] : [];

  const highlights: Highlight[] = [
    ...(exp.analysis?.analysis.equations ?? []).map((e, i) => ({ id: `eq-${i}`, page: e.source_page, span: e.text_span, kind: "equation" as const, label: `Equation ${i + 1} (quoted)` })),
    ...Object.entries(exp.params)
      .filter(([, p]) => p.evidence)
      .map(([k, p]) => ({ id: `param-${k}`, page: p.evidence!.page, span: p.evidence!.span, kind: "variable" as const, label: `${t.params.find((d) => d.key === k)?.label} — mapped parameter` })),
  ];
  const activeKey = active?.startsWith("param-") ? active.slice(6) : null;
  const mismatch = exp.analysis?.mismatch ?? null;

  async function exportPng() {
    const svg = vizRef.current?.querySelector<SVGSVGElement>("svg.recharts-surface, svg[data-testid='arm-svg']");
    if (!svg) return setToast("Nothing to export yet.");
    try {
      downloadBlob(await svgToPngBlob(svg, "#15191e"), `${slug(t.name)}.png`);
      setToast("PNG downloaded");
    } catch {
      setToast("PNG export failed in this browser. Try JSON or HTML.");
    }
  }
  function exportJson() {
    downloadBlob(new Blob([JSON.stringify(buildScenario(exp!), null, 2)], { type: "application/json" }), `${slug(t.name)}-scenario.json`);
    setToast("Scenario JSON downloaded");
  }
  function exportHtml() {
    downloadBlob(new Blob([buildStandaloneHtml(exp!)], { type: "text/html" }), `${slug(t.name)}.html`);
    setToast("Offline HTML downloaded");
  }
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setToast(exp!.demo ? "Link copied" : "Link copied — it opens only in this browser, where the experiment is stored. Share the HTML export instead.");
    } catch {
      setToast("Couldn’t access the clipboard.");
    }
  }
  function pin(label: "A" | "B") {
    setPins((ps) => [...ps.filter((p) => p.label !== label), { label, values: { ...values }, options: { ...exp!.options } }].sort((a, b) => a.label.localeCompare(b.label)));
    setToast(`Pinned current run as ${label}`);
  }
  function resetAll() {
    if (initial.current) setExp(structuredClone(initial.current));
    setToast(exp!.demo ? "Reset to illustrative defaults" : "Reset to the confirmed source values");
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-dvh bg-studio text-studio-text">
        <header className="sticky top-0 z-30 border-b border-studio-line bg-studio/95 backdrop-blur">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
            <Link href="/" className="flex items-center gap-1 text-studio-muted hover:text-studio-text" aria-label="Back to home">
              <ArrowLeft className="size-4" />
            </Link>
            <Logo className="hidden text-studio-text sm:flex" />
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-semibold" data-testid="studio-title">
                {t.name}
                <span className="ml-2 font-normal text-studio-muted">{exp.source ? `— ${exp.source.title}` : "— illustrative demo"}</span>
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="studio" size="sm" onClick={() => pin("A")} data-testid="pin-a">
                <Pin /> Pin A
              </Button>
              <Button variant="studio" size="sm" onClick={() => pin("B")} data-testid="pin-b">
                <Pin /> Pin B
              </Button>
              <Button variant="studio" size="sm" onClick={resetAll} data-testid="reset-all">
                <RotateCcw /> Reset
              </Button>
              <Button variant="studio" size="sm" onClick={copyLink}>
                <Link2 /> Share
              </Button>
              <Button variant="studio" size="sm" onClick={exportPng} disabled={!valid} data-testid="export-png">
                <ImageIcon /> PNG
              </Button>
              <Button variant="studio" size="sm" onClick={exportJson} data-testid="export-json">
                <FileJson /> JSON
              </Button>
              <Button variant="studio-primary" size="sm" onClick={exportHtml} data-testid="export-html">
                <FileCode2 /> HTML
              </Button>
            </div>
          </div>
          {mismatch && (
            <p className="flex items-start gap-2 border-t border-studio-line bg-adjusted/10 px-4 py-2 text-sm text-adjusted sm:px-6" data-testid="studio-mismatch">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>
                <strong>Not an implementation of the paper’s model.</strong> {mismatch.reason} Treat this as a simplified conceptual exploration.
              </span>
            </p>
          )}
        </header>

        <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-[minmax(260px,340px)_minmax(0,1fr)_minmax(300px,360px)]">
          {/* Evidence */}
          <aside className="order-3 min-w-0 space-y-5 lg:order-1 lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto lg:pr-1" aria-label="Evidence">
            <section className="rounded-[var(--radius-card)] bg-studio-raised p-4">
              <h2 className="text-sm font-semibold">What the simulator computes</h2>
              <p className="mt-1 text-xs text-studio-muted">Template equations — written by us and unit-tested, not quoted from the paper.</p>
              <div className="mt-2 space-y-1 text-[15px]" data-testid="template-equations">
                {(exp.template === "battery-fade" ? [exp.options.fadeMode === "geometric" ? t.equations[0] : t.equations[1]] : t.equations).map((eq) => (
                  <TeX key={eq} tex={eq} display />
                ))}
              </div>
              <h3 className="mt-3 text-xs font-semibold text-studio-muted">Assumptions</h3>
              <ul className="mt-1 list-disc space-y-1 pl-4 text-xs leading-relaxed text-studio-muted">
                {t.assumptions.map((a) => <li key={a}>{a}</li>)}
              </ul>
            </section>

            {exp.source ? (
              <>
                <section className="rounded-[var(--radius-card)] bg-studio-raised p-4">
                  <h2 className="text-sm font-semibold">Source</h2>
                  <p className="mt-1 text-xs leading-relaxed text-studio-muted" data-testid="attribution">{attributionLine(exp)}</p>
                  <p className="mt-2 text-xs text-studio-muted">
                    {exp.analysis?.engine === "gemini" ? `Extracted by Gemini (${exp.analysis.model}), checked against the page text.` : "Extracted by the offline rule-based extractor (no AI), checked against the page text."}
                  </p>
                  {(exp.analysis?.analysis.equations.length ?? 0) > 0 && (
                    <>
                      <h3 className="mt-3 text-xs font-semibold text-studio-muted">Equations quoted from the source</h3>
                      <ul className="mt-1 space-y-1">
                        {exp.analysis!.analysis.equations.map((e, i) => (
                          <li key={i}>
                            <button
                              onClick={() => setActive(`eq-${i}`)}
                              className={cn("w-full rounded-xl px-2 py-1 text-left text-sm hover:bg-studio-line", active === `eq-${i}` && "bg-signal/15")}
                            >
                              <TeX tex={e.latex_string} /> <span className="text-xs text-trace">p. {e.source_page}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </section>
                <PaperEvidence
                  pages={exp.pages}
                  highlights={highlights}
                  activeId={active}
                  onSelect={setActive}
                  tone="dark"
                />
              </>
            ) : (
              <section className="rounded-[var(--radius-card)] border border-dashed border-studio-line p-4 text-sm text-studio-muted">
                No paper loaded. Every value here is illustrative.{" "}
                <Link href="/#upload" className="text-trace underline-offset-2 hover:underline">
                  Upload a paper
                </Link>{" "}
                to map real values with page references.
              </section>
            )}
          </aside>

          {/* Simulator */}
          <section className="order-1 min-w-0 space-y-4 lg:order-2" aria-label="Simulator">
            <div ref={vizRef} className="relative overflow-hidden rounded-[var(--radius-panel)] border border-studio-line bg-studio">
              {exp.template === "robot-arm" && (
                <div className="mx-auto aspect-square max-h-[68dvh] w-full">
                  <RobotArm
                    L1={drawn.L1}
                    L2={drawn.L2}
                    theta1={drawn.theta1}
                    theta2={drawn.theta2}
                    target={exp.options.showTarget ? { x: values.targetX, y: values.targetY } : null}
                    ghosts={pins.map((p) => ({ label: p.label, L1: p.values.L1, L2: p.values.L2, theta1: p.values.theta1, theta2: p.values.theta2 }))}
                    onPickTarget={exp.options.showTarget ? (p) => { setParam("targetX", p.x); setParam("targetY", p.y); } : undefined}
                  />
                </div>
              )}
              {exp.template === "battery-fade" && (
                <div className="h-[52dvh] min-h-[340px] w-full p-2">
                  {valid ? (
                    <BatteryChart
                      current={batteryInput(values, exp.options.fadeMode)}
                      baselines={pins.map((p) => ({ label: p.label, input: batteryInput(p.values, p.options.fadeMode) }))}
                    />
                  ) : (
                    <InvalidNote />
                  )}
                </div>
              )}
              {exp.template === "queue-mm1" && (
                <div className="h-[52dvh] min-h-[340px] w-full p-2">
                  {valid ? <QueueChart current={{ lambda: values.lambda, mu: values.mu }} baselines={pins.map((p) => ({ label: p.label, input: { lambda: p.values.lambda, mu: p.values.mu } }))} /> : <InvalidNote />}
                </div>
              )}
            </div>

            {exp.template === "queue-mm1" && valid && (
              <div className="rounded-[var(--radius-card)] bg-studio-raised p-4">
                <UtilizationMeter lambda={values.lambda} mu={values.mu} />
              </div>
            )}

            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5" data-testid="outputs" aria-live="polite">
              {outs.map((o) => (
                <div key={o.label} className="rounded-2xl bg-studio-raised px-4 py-3">
                  <dt className="text-xs text-studio-muted">{o.label}</dt>
                  <dd className={cn("tabular mt-0.5 text-lg font-semibold", o.value.startsWith("Unstable") && "text-base text-danger")} data-testid={`out-${slug(o.label)}`}>
                    {o.value}
                  </dd>
                </div>
              ))}
            </dl>

            {pins.length > 0 && (
              <section className="rounded-[var(--radius-card)] bg-studio-raised p-4" data-testid="compare">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-sm font-semibold">Compare runs</h2>
                  <button onClick={() => setPins([])} className="flex items-center gap-1 text-xs text-studio-muted hover:text-studio-text">
                    <X className="size-3" /> Clear pins
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="tabular w-full min-w-[420px] text-sm">
                    <thead className="text-left text-xs text-studio-muted">
                      <tr>
                        <th className="py-1 pr-3 font-semibold">Quantity</th>
                        {pins.map((p) => <th key={p.label} className="py-1 pr-3 font-semibold">Pinned {p.label}</th>)}
                        <th className="py-1 font-semibold">Current</th>
                      </tr>
                    </thead>
                    <tbody>
                      {t.params
                        .filter((d) => !hidden.includes(d.key))
                        .map((d) => (
                          <tr key={d.key} className="border-t border-studio-line">
                            <td className="py-1.5 pr-3 text-studio-muted">{d.label} ({d.unit})</td>
                            {pins.map((p) => <td key={p.label} className="py-1.5 pr-3">{+p.values[d.key].toFixed(5)}</td>)}
                            <td className="py-1.5">{+values[d.key].toFixed(5)}</td>
                          </tr>
                        ))}
                      {outs.map((o, i) => (
                        <tr key={o.label} className="border-t border-studio-line">
                          <td className="py-1.5 pr-3 font-semibold">{o.label}</td>
                          {pins.map((p) => <td key={p.label} className="py-1.5 pr-3">{outputs(exp.template, p.values, p.options)[i]?.value}</td>)}
                          <td className="py-1.5 font-semibold">{o.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </section>

          {/* Controls */}
          <aside className="order-2 min-w-0 lg:order-3 lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto" aria-label="Parameters">
            <div className="rounded-[var(--radius-card)] bg-studio-raised/40 p-2">
              <div className="flex flex-wrap items-center gap-2 px-3 pb-2 pt-2">
                <h2 className="mr-auto text-sm font-semibold">Parameters</h2>
                <ProvenanceChip provenance="paper" />
                <ProvenanceChip provenance="user" />
                <ProvenanceChip provenance="illustrative" />
              </div>

              {exp.template === "battery-fade" && (
                <div className="px-3 pb-2">
                  <div role="radiogroup" aria-label="Fade model" className="grid grid-cols-2 gap-1 rounded-full bg-studio p-1 text-sm">
                    {(["geometric", "linear"] as FadeMode[]).map((m) => (
                      <button
                        key={m}
                        role="radio"
                        aria-checked={exp.options.fadeMode === m}
                        onClick={() => setOptions({ fadeMode: m })}
                        className={cn("rounded-full px-3 py-1.5 font-semibold", exp.options.fadeMode === m ? "bg-signal text-white" : "text-studio-muted hover:text-studio-text")}
                        data-testid={`fade-${m}`}
                      >
                        {m === "geometric" ? "Geometric fade" : "Linear fade"}
                      </button>
                    ))}
                  </div>
                  {exp.options.fadeMode === "linear" && (
                    <p className="mt-2 rounded-xl bg-adjusted/10 px-3 py-2 text-xs text-adjusted">
                      Linear fade is a cruder assumption: constant Ah lost per cycle, clamped at zero. Use it only if the source states a linear trend.
                    </p>
                  )}
                </div>
              )}
              {exp.template === "queue-mm1" && (
                <p className="px-3 pb-2 text-xs text-studio-muted">
                  Queue discipline: first-come-first-served, one server, unlimited buffer. Other disciplines aren’t modelled.
                </p>
              )}
              {exp.template === "robot-arm" && (
                <label className="flex items-center gap-2 px-3 pb-2 text-sm text-studio-muted">
                  <input type="checkbox" className="size-4 accent-[#0866ff]" checked={exp.options.showTarget} onChange={(e) => setOptions({ showTarget: e.target.checked })} />
                  Show a target point (click the plot to move it)
                </label>
              )}

              <ParameterControls
                defs={t.params}
                params={exp.params}
                errors={errors}
                activeKey={activeKey}
                hidden={hidden}
                onChange={(k, v) => {
                  setParam(k, v);
                  setActive(`param-${k}`);
                }}
                onReset={resetParam}
                onFocusEvidence={(k) => setActive(`param-${k}`)}
              />
            </div>
          </aside>
        </div>

        {toast && (
          <div role="status" className="fixed bottom-5 left-1/2 z-50 max-w-[90vw] -translate-x-1/2 rounded-full bg-paper px-5 py-2.5 text-sm font-medium text-ink shadow-xl" data-testid="toast">
            <Download className="mr-1.5 inline size-4 text-signal" />
            {toast}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

function InvalidNote() {
  return <div className="flex h-full items-center justify-center p-6 text-center text-sm text-danger">Fix the highlighted parameter to redraw the chart. Out-of-range values aren’t plotted.</div>;
}
