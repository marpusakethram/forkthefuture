"use client";
import katex from "katex";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

/** Renders LaTeX with KaTeX. `trust` stays off, so source-supplied LaTeX can't inject HTML. */
export function Math({ tex, display = false, className }: { tex: string; display?: boolean; className?: string }) {
  const html = useMemo(
    () => katex.renderToString(tex, { displayMode: display, throwOnError: false, trust: false, strict: "ignore", output: "htmlAndMathml" }),
    [tex, display],
  );
  return <span className={cn(className)} dangerouslySetInnerHTML={{ __html: html }} />;
}
