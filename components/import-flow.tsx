"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, FileText, Loader2, XCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Math as TeX } from "./math";
import { PaperEvidence, type Highlight } from "./paper-evidence";
import { SimulatorSelector } from "./simulator-selector";
import { DemoCards } from "./demo-cards";
import { loadDraft, saveExperiment, type ImportDraft } from "@/lib/store";
import type { AnalyzeResponse, Variable } from "@/lib/ai/extract-schema";
import { TEMPLATES, type TemplateId } from "@/lib/models/templates";
import { checkParam } from "@/lib/models/validation";
import { experimentFromConfirmed, newId, type SourceInfo } from "@/lib/experiment";
import { cn } from "@/lib/utils";

type Phase = "select" | "analyzing" | "result";

interface Decision {
  accepted: boolean;
  value: string;
  variable: Variable;
}

function attributionFor(d: ImportDraft): string {
  if (d.kind === "sample") return "Self-authored ForkTheFuture sample handout, licensed CC BY 4.0.";
  if (d.kind === "pdf") return `Extracted from the uploaded file ${d.fileName}. Rights remain with the original authors — cite the original publication.`;
  return "Extracted from pasted text. Cite the original publication.";
}

export function ImportFlow() {
  const router = useRouter();
  const [draft, setDraft] = useState<ImportDraft | null | undefined>(undefined);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [phase, setPhase] = useState<Phase>("select");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [meta, setMeta] = useState({ title: "", authors: "", date: "" });
  const [template, setTemplate] = useState<TemplateId | null>(null);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const d = loadDraft();
    setDraft(d);
    if (d) {
      setSelected(new Set(d.pages.filter((p) => !d.imageOnlyPages.includes(p.page)).map((p) => p.page)));
      setMeta((m) => ({ ...m, title: d.meta.title ?? "" }));
    }
  }, []);

  const selectedPages = useMemo(() => (draft ? draft.pages.filter((p) => selected.has(p.page)) : []), [draft, selected]);
  const selectedChars = selectedPages.reduce((n, p) => n + p.text.length, 0);

  async function analyze() {
    if (!draft) return;
    setError(null);
    setPhase("analyzing");
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pages: selectedPages, title: meta.title || undefined }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `Analysis failed (HTTP ${res.status}).`);
      const r = body as AnalyzeResponse;
      setResult(r);
      setMeta({
        title: meta.title || r.analysis.title,
        authors: r.analysis.authors_as_stated.join(", ") || draft.meta.author || "",
        date: r.analysis.date_as_stated ?? "",
      });
      const t = r.analysis.candidate_template === "unsupported" ? null : (r.analysis.candidate_template as TemplateId);
      setTemplate(t);
      setDecisions(initialDecisions(r, t));
      setPhase("result");
    } catch (e) {
      setError((e as Error).message || "Analysis failed. Check your connection and try again.");
      setPhase("select");
    }
  }

  function initialDecisions(r: AnalyzeResponse, t: TemplateId | null): Record<string, Decision> {
    if (!t || t !== r.analysis.candidate_template) return {};
    const out: Record<string, Decision> = {};
    for (const v of r.analysis.variables) {
      if (!v.maps_to || out[v.maps_to]) continue;
      out[v.maps_to] = { accepted: v.default_candidate !== null, value: v.default_candidate === null ? "" : String(v.default_candidate), variable: v };
    }
    return out;
  }

  function openStudio() {
    if (!draft || !result || !template) return;
    const source: SourceInfo = {
      kind: draft.kind,
      fileName: draft.fileName,
      sha256: draft.sha256,
      title: meta.title.trim() || "Untitled source",
      authors: meta.authors.split(",").map((s) => s.trim()).filter(Boolean),
      date: meta.date.trim() || null,
      attribution: attributionFor(draft),
    };
    const confirmed = Object.entries(decisions)
      .filter(([, d]) => d.accepted && d.value.trim() !== "" && Number.isFinite(Number(d.value)))
      .map(([key, d]) => ({ key, value: Number(d.value), page: d.variable.evidence_page, span: d.variable.text_span, symbol: d.variable.symbol }));
    const exp = experimentFromConfirmed({ id: newId(), template, source, pages: selectedPages, analysis: result, confirmed });
    saveExperiment(exp);
    router.push(`/playground/${exp.id}`);
  }

  if (draft === undefined) return <p className="py-20 text-center text-slate">Loading…</p>;
  if (draft === null)
    return (
      <div className="mx-auto max-w-xl py-20 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Nothing to review yet</h1>
        <p className="mt-3 text-slate">Imported text is kept only for this browser tab. Upload a PDF or try the sample to start.</p>
        <Button asChild className="mt-6">
          <Link href="/#upload">Upload a paper</Link>
        </Button>
      </div>
    );

  const highlights: Highlight[] = result
    ? [
        ...result.analysis.equations.map((e, i) => ({ id: `eq-${i}`, page: e.source_page, span: e.text_span, kind: "equation" as const, label: `Equation ${i + 1}` })),
        ...result.analysis.variables.map((v, i) => ({ id: `var-${i}`, page: v.evidence_page, span: v.text_span, kind: "variable" as const, label: v.meaning || v.symbol })),
      ]
    : [];

  const supported = result && result.analysis.candidate_template !== "unsupported";
  const tdef = template ? TEMPLATES[template] : null;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-sm text-slate">
            <FileText className="size-4" />
            {draft.fileName ?? "Pasted text"} — {draft.numPages} page{draft.numPages === 1 ? "" : "s"}
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">{phase === "result" ? "Check the evidence" : "Choose pages to analyse"}</h1>
        </div>
        {phase === "result" && (
          <Button variant="outline" onClick={() => setPhase("select")}>
            Change pages
          </Button>
        )}
      </header>

      {phase !== "result" && (
        <section className="space-y-4">
          {draft.imageOnlyPages.length > 0 && (
            <p className="flex items-start gap-2 rounded-2xl bg-[#fff4e0] px-4 py-3 text-sm text-[#7a4b00]">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              Pages {draft.imageOnlyPages.join(", ")} have little or no selectable text (scanned images?). They’re unselected; run OCR if they matter.
            </p>
          )}
          <label className="block max-w-xl">
            <span className="mb-1 block text-sm font-semibold">Title (optional)</span>
            <input
              value={meta.title}
              onChange={(e) => setMeta({ ...meta, title: e.target.value })}
              placeholder="Taken from the paper if left empty"
              className="h-11 w-full rounded-xl border border-line bg-paper px-3 outline-none focus:border-signal"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {draft.pages.map((p) => {
              const on = selected.has(p.page);
              return (
                <label
                  key={p.page}
                  className={cn("flex cursor-pointer flex-col gap-2 rounded-2xl border p-4 transition-colors", on ? "border-signal bg-signal-soft/50" : "border-line bg-paper")}
                >
                  <span className="flex items-center justify-between">
                    <span className="font-semibold">Page {p.page}</span>
                    <input
                      type="checkbox"
                      className="size-4 accent-[#0866ff]"
                      checked={on}
                      onChange={() => {
                        const s = new Set(selected);
                        if (on) s.delete(p.page);
                        else s.add(p.page);
                        setSelected(s);
                      }}
                      aria-label={`Analyse page ${p.page}`}
                    />
                  </span>
                  <span className="line-clamp-5 whitespace-pre-wrap text-[13px] leading-relaxed text-slate">{p.text || "(no text on this page)"}</span>
                </label>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Button size="lg" onClick={analyze} disabled={selected.size === 0 || phase === "analyzing"} data-testid="analyze">
              {phase === "analyzing" ? (
                <>
                  <Loader2 className="animate-spin" /> Analysing {selected.size} page{selected.size === 1 ? "" : "s"}…
                </>
              ) : (
                `Analyse ${selected.size} page${selected.size === 1 ? "" : "s"}`
              )}
            </Button>
            <span className="tabular text-sm text-slate">{selectedChars.toLocaleString()} characters selected</span>
          </div>
          {error && (
            <p role="alert" className="rounded-2xl bg-[#fdecec] px-4 py-3 text-sm text-[#a1262b]" data-testid="analyze-error">
              {error}
            </p>
          )}
        </section>
      )}

      {phase === "result" && result && (
        <div className="grid gap-8 lg:grid-cols-[1fr_minmax(0,440px)]">
          <div className="min-w-0 space-y-8">
            <section className="rounded-[var(--radius-card)] border border-line p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-2">
                {supported ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e6f6ee] px-3 py-1 text-sm font-semibold text-[#1d7a4c]" data-testid="badge-supported">
                    <CheckCircle2 className="size-4" /> Supported: {TEMPLATES[result.analysis.candidate_template as TemplateId].name}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fdecec] px-3 py-1 text-sm font-semibold text-[#a1262b]" data-testid="badge-unsupported">
                    <XCircle className="size-4" /> Unsupported
                  </span>
                )}
                {supported && <span className="tabular text-sm text-slate">Match confidence {(result.analysis.template_match_confidence * 100).toFixed(0)}%</span>}
                <span className="rounded-full bg-mist px-3 py-1 text-xs font-semibold text-slate" data-testid="engine-label">
                  {result.engine === "gemini" ? `Extracted by Gemini (${result.model})` : "Offline rule-based extractor — no AI"}
                </span>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-[2fr_1.2fr_0.8fr]">
                <label className="block">
                  <span className="mb-1 block text-sm font-semibold">Title</span>
                  <input value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} className="h-10 w-full rounded-xl border border-line px-3 outline-none focus:border-signal" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-semibold">Authors as stated</span>
                  <input value={meta.authors} onChange={(e) => setMeta({ ...meta, authors: e.target.value })} placeholder="Not stated" className="h-10 w-full rounded-xl border border-line px-3 outline-none focus:border-signal" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-semibold">Date as stated</span>
                  <input value={meta.date} onChange={(e) => setMeta({ ...meta, date: e.target.value })} placeholder="Not stated" className="h-10 w-full rounded-xl border border-line px-3 outline-none focus:border-signal" />
                </label>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-slate">
                <strong className="text-ink">Why this template: </strong>
                {result.analysis.template_rationale || "No rationale given."}
              </p>
              {result.analysis.central_question && (
                <p className="mt-2 text-sm leading-relaxed text-slate">
                  <strong className="text-ink">Central question: </strong>
                  {result.analysis.central_question}
                </p>
              )}
              {result.warnings.map((w) => (
                <p key={w} className="mt-3 rounded-xl bg-mist px-3 py-2 text-sm text-slate">{w}</p>
              ))}
            </section>

            {result.mismatch && (
              <p className="flex items-start gap-2 rounded-2xl bg-[#fff4e0] px-4 py-3 text-sm text-[#7a4b00]" data-testid="mismatch-banner">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span>
                  <strong>Not an implementation of the paper’s model.</strong> {result.mismatch.reason} You can still explore the simplified template conceptually.
                </span>
              </p>
            )}

            {!supported ? (
              <section className="space-y-6" data-testid="unsupported-panel">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">No supported template fits this source</h2>
                  <p className="mt-2 max-w-2xl text-slate">
                    ForkTheFuture only simulates three small model families. Nothing from this source will be run as a simulation. You can still open a template with illustrative values — they won’t be labelled as coming from this paper.
                  </p>
                </div>
                <DemoCards />
              </section>
            ) : (
              <>
                <section>
                  <h2 className="mb-3 text-xl font-bold tracking-tight">Confirm the template</h2>
                  <SimulatorSelector
                    recommended={result.analysis.candidate_template}
                    value={template}
                    onChange={(t) => {
                      setTemplate(t);
                      setDecisions(initialDecisions(result, t));
                    }}
                  />
                  {template && template !== result.analysis.candidate_template && (
                    <p className="mt-2 text-sm text-slate">You picked a different template from the recommendation, so no paper values are mapped. Every slider will start as illustrative.</p>
                  )}
                </section>

                {tdef && (
                  <section>
                    <h2 className="text-xl font-bold tracking-tight">Confirm each parameter</h2>
                    <p className="mb-3 mt-1 text-sm text-slate">Only checked values are labelled “from paper”. Everything else starts as an illustrative default.</p>
                    <div className="overflow-x-auto rounded-2xl border border-line">
                      <table className="w-full min-w-[640px] text-sm" data-testid="param-table">
                        <thead className="bg-mist text-left text-slate">
                          <tr>
                            <th className="px-4 py-2 font-semibold">Use</th>
                            <th className="px-4 py-2 font-semibold">Parameter</th>
                            <th className="px-4 py-2 font-semibold">Source says</th>
                            <th className="px-4 py-2 font-semibold">Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tdef.params.map((p) => {
                            const d = decisions[p.key];
                            const err = d && d.value !== "" ? checkParam(tdef.id, p.key, Number(d.value)) : null;
                            const vi = d ? result.analysis.variables.indexOf(d.variable) : -1;
                            return (
                              <tr key={p.key} className="border-t border-line align-top" data-testid={`param-row-${p.key}`}>
                                <td className="px-4 py-3">
                                  <input
                                    type="checkbox"
                                    className="size-4 accent-[#0866ff]"
                                    disabled={!d}
                                    checked={!!d?.accepted}
                                    onChange={() => setDecisions({ ...decisions, [p.key]: { ...d!, accepted: !d!.accepted } })}
                                    aria-label={`Use the source value for ${p.label}`}
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  <span className="font-semibold">{p.label}</span> <TeX tex={p.symbol} />
                                </td>
                                <td className="px-4 py-3">
                                  {d ? (
                                    <button className="text-left" onClick={() => setActive(`var-${vi}`)}>
                                      <q className="text-ink">{d.variable.text_span}</q>
                                      <span className="ml-1 whitespace-nowrap text-signal underline-offset-2 hover:underline">p. {d.variable.evidence_page}</span>
                                    </button>
                                  ) : (
                                    <span className="text-slate">Not provided — will be illustrative</span>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  {d ? (
                                    <>
                                      <span className="flex items-center gap-1.5">
                                        <input
                                          type="number"
                                          step="any"
                                          value={d.value}
                                          onChange={(e) => setDecisions({ ...decisions, [p.key]: { ...d, value: e.target.value } })}
                                          className={cn("tabular h-9 w-28 rounded-lg border px-2 outline-none focus:border-signal", err ? "border-danger" : "border-line")}
                                          aria-label={`${p.label} value in ${p.unit}`}
                                          aria-invalid={!!err}
                                        />
                                        <span className="text-slate">{p.unit}</span>
                                      </span>
                                      {err && <span className="mt-1 block text-xs text-danger">{err}. It will be clamped and marked adjusted.</span>}
                                    </>
                                  ) : (
                                    <span className="tabular text-slate">
                                      {p.default} {p.unit}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-5 flex flex-wrap items-center gap-3">
                      <Button size="lg" onClick={openStudio} data-testid="open-studio">
                        Open in studio
                      </Button>
                      <span className="text-sm text-slate">Template equations run with your confirmed values. You can still change everything there.</span>
                    </div>
                  </section>
                )}
              </>
            )}

            <section>
              <h2 className="mb-3 text-xl font-bold tracking-tight">Equations found in the source</h2>
              {result.analysis.equations.length === 0 ? (
                <p className="text-sm text-slate">None found in the selected pages.</p>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-line">
                  <table className="w-full min-w-[560px] text-sm" data-testid="equation-table">
                    <thead className="bg-mist text-left text-slate">
                      <tr>
                        <th className="px-4 py-2 font-semibold">Equation</th>
                        <th className="px-4 py-2 font-semibold">How</th>
                        <th className="px-4 py-2 font-semibold">Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.analysis.equations.map((e, i) => (
                        <tr key={i} className="border-t border-line">
                          <td className="px-4 py-3">
                            <TeX tex={e.latex_string} />
                          </td>
                          <td className="px-4 py-3 text-slate">{e.extracted_vs_inferred === "extracted" ? "Transcribed" : "Inferred"}</td>
                          <td className="px-4 py-3">
                            <button className="text-signal underline-offset-2 hover:underline" onClick={() => setActive(`eq-${i}`)}>
                              Page {e.source_page}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {(result.analysis.limitations.length > 0 || result.analysis.contradictions.length > 0 || result.rejected.length > 0) && (
              <section className="grid gap-6 md:grid-cols-2">
                {result.analysis.limitations.length > 0 && (
                  <div>
                    <h3 className="mb-2 font-semibold">Limitations the source states</h3>
                    <ul className="list-disc space-y-1 pl-5 text-sm text-slate">
                      {result.analysis.limitations.map((l) => <li key={l}>{l}</li>)}
                    </ul>
                  </div>
                )}
                {result.analysis.contradictions.length > 0 && (
                  <div>
                    <h3 className="mb-2 font-semibold">Contradictions</h3>
                    <ul className="list-disc space-y-1 pl-5 text-sm text-slate">
                      {result.analysis.contradictions.map((l) => <li key={l}>{l}</li>)}
                    </ul>
                  </div>
                )}
                {result.rejected.length > 0 && (
                  <div>
                    <h3 className="mb-2 font-semibold">Discarded — evidence didn’t check out</h3>
                    <ul className="list-disc space-y-1 pl-5 text-sm text-slate" data-testid="rejected-list">
                      {result.rejected.map((r, i) => (
                        <li key={i}>
                          {r.kind} “{r.label}”: {r.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            )}
          </div>

          <aside className="lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto">
            <h2 className="mb-3 text-xl font-bold tracking-tight">Source text</h2>
            <PaperEvidence pages={selectedPages} highlights={highlights} activeId={active} onSelect={setActive} />
          </aside>
        </div>
      )}
    </div>
  );
}
