// Standalone single-page build of ForkTheFuture for hosted previews.
// Same components as the Next app; /api/analyze runs in the browser with the offline extractor.
import "@fontsource-variable/figtree";
import "katex/dist/katex.min.css";
import { createRoot } from "react-dom/client";
import { useEffect, useState } from "react";
import Home from "@/app/page";
import { SiteNav } from "@/components/site-nav";
import { ImportFlow } from "@/components/import-flow";
import { Studio } from "@/components/studio";
import { AnalyzeRequestSchema, type AnalyzeResponse } from "@/lib/ai/extract-schema";
import { analyzeOffline } from "@/lib/analysis/offline";
import { detectMismatch, verifyAgainstSource } from "@/lib/analysis/verify";
import { currentPath, subscribe } from "./router";

const realFetch = window.fetch.bind(window);
window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (!url.endsWith("/api/analyze")) return realFetch(input, init);
  const parsed = AnalyzeRequestSchema.safeParse(JSON.parse(String(init?.body ?? "{}")));
  if (!parsed.success) return new Response(JSON.stringify({ error: parsed.error.issues[0]?.message }), { status: 400 });
  const { pages, title } = parsed.data;
  if (pages.every((p) => p.text.trim().length === 0)) return new Response(JSON.stringify({ error: "The selected pages contain no text." }), { status: 422 });
  const { analysis, rejected } = verifyAgainstSource(analyzeOffline(pages, title), pages);
  const body: AnalyzeResponse = {
    analysis,
    engine: "offline-rules",
    model: null,
    rejected,
    warnings: ["This hosted preview has no server, so the offline rule-based extractor ran in your browser. No AI was used."],
    mismatch: detectMismatch(analysis.candidate_template, pages),
  };
  return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
};

function App() {
  const [path, setPath] = useState(currentPath());
  useEffect(() => {
    const off = subscribe(setPath);
    return () => {
      off();
    };
  }, []);
  if (path.startsWith("/playground/")) return <Studio key={path} id={path.slice("/playground/".length)} />;
  if (path === "/import")
    return (
      <>
        <SiteNav />
        <main className="mx-auto max-w-7xl px-4 pb-24 pt-8 sm:px-6">
          <ImportFlow />
        </main>
      </>
    );
  return <Home />;
}

createRoot(document.getElementById("ftf-app")!).render(<App />);
