"use client";
import { useEffect, useMemo, useRef } from "react";
import type { SourcePage } from "@/lib/ai/extract-schema";
import { findSpan } from "@/lib/analysis/spans";
import { cn, revealInPanel } from "@/lib/utils";

export interface Highlight {
  id: string;
  page: number;
  span: string;
  kind: "equation" | "variable";
  label: string;
}

interface Props {
  pages: SourcePage[];
  highlights: Highlight[];
  activeId?: string | null;
  onSelect?: (id: string) => void;
  tone?: "light" | "dark";
  className?: string;
}

/** Renders source pages with clickable highlights at the exact quoted spans. */
export function PaperEvidence({ pages, highlights, activeId, onSelect, tone = "light", className }: Props) {
  const container = useRef<HTMLDivElement>(null);

  const segmentsByPage = useMemo(() => {
    const out = new Map<number, { text: string; h?: Highlight }[]>();
    for (const p of pages) {
      const located = highlights
        .filter((h) => h.page === p.page)
        .map((h) => ({ h, loc: findSpan(p.text, h.span) }))
        .filter((x): x is { h: Highlight; loc: { start: number; end: number } } => x.loc !== null)
        .sort((a, b) => a.loc.start - b.loc.start);
      const segs: { text: string; h?: Highlight }[] = [];
      let cursor = 0;
      for (const { h, loc } of located) {
        if (loc.start < cursor) continue; // overlapping span: keep the earlier one
        if (loc.start > cursor) segs.push({ text: p.text.slice(cursor, loc.start) });
        segs.push({ text: p.text.slice(loc.start, loc.end), h });
        cursor = loc.end;
      }
      if (cursor < p.text.length) segs.push({ text: p.text.slice(cursor) });
      out.set(p.page, segs);
    }
    return out;
  }, [pages, highlights]);

  useEffect(() => {
    if (!activeId || !container.current) return;
    const el = container.current.querySelector<HTMLElement>(`[data-hl="${CSS.escape(activeId)}"]`);
    if (el) revealInPanel(el, "center");
  }, [activeId]);

  const dark = tone === "dark";
  return (
    <div ref={container} className={cn("space-y-4", className)} data-testid="paper-evidence">
      {pages.map((p) => (
        <article key={p.page} id={`page-${p.page}`} className={cn("rounded-2xl p-4", dark ? "bg-studio-raised" : "bg-mist")}>
          <h4 className={cn("mb-2 text-sm font-semibold", dark ? "text-studio-muted" : "text-slate")}>Page {p.page}</h4>
          <p className={cn("whitespace-pre-wrap text-[13.5px] leading-relaxed", dark ? "text-studio-text/90" : "text-ink")}>
            {segmentsByPage.get(p.page)?.map((s, i) =>
              s.h ? (
                <mark
                  key={i}
                  className={cn("evidence", s.h.kind === "equation" && "equation")}
                  data-hl={s.h.id}
                  data-active={activeId === s.h.id}
                  role="button"
                  tabIndex={0}
                  title={s.h.label}
                  aria-label={`${s.h.label}: ${s.text}`}
                  onClick={() => onSelect?.(s.h!.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect?.(s.h!.id);
                    }
                  }}
                >
                  {s.text}
                </mark>
              ) : (
                <span key={i}>{s.text}</span>
              ),
            )}
          </p>
        </article>
      ))}
    </div>
  );
}
