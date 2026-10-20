import { NextResponse } from "next/server";
import { AnalyzeRequestSchema, type AnalyzeResponse } from "@/lib/ai/extract-schema";
import { analyzeWithGemini, GeminiError, geminiConfig } from "@/lib/ai/gemini";
import { analyzeOffline } from "@/lib/analysis/offline";
import { detectMismatch, verifyAgainstSource } from "@/lib/analysis/verify";

export const runtime = "nodejs";

const FALLBACK_NOTE: Record<GeminiError["code"], string> = {
  NO_KEY: "No Gemini key is configured, so the offline rule-based extractor ran instead. No AI was used.",
  MODEL_NOT_ALLOWED: "The configured Gemini model is not on the free-tier allowlist. The offline rule-based extractor ran instead.",
  QUOTA: "Gemini's free-tier quota is used up. The offline rule-based extractor ran instead. Try again later for AI extraction.",
  BUDGET: "This server hit its daily Gemini budget. The offline rule-based extractor ran instead.",
  TOO_LARGE: "",
  BAD_OUTPUT: "Gemini's answer failed schema validation, so it was discarded and the offline rule-based extractor ran instead.",
  UPSTREAM: "Gemini could not be reached. The offline rule-based extractor ran instead.",
};

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }
  const parsed = AnalyzeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  }
  const { pages, title } = parsed.data;
  if (pages.every((p) => p.text.trim().length === 0)) {
    return NextResponse.json({ error: "The selected pages contain no text." }, { status: 422 });
  }

  const warnings: string[] = [];
  let raw;
  let engine: AnalyzeResponse["engine"] = "offline-rules";
  let model: string | null = null;

  try {
    const g = await analyzeWithGemini(pages, title);
    raw = g.analysis;
    engine = "gemini";
    model = g.model;
    if (g.cached) warnings.push("Served from this server's cache of an identical earlier request.");
  } catch (e) {
    if (!(e instanceof GeminiError)) throw e;
    if (e.code === "TOO_LARGE") return NextResponse.json({ error: e.message, code: "TOO_LARGE" }, { status: 413 });
    warnings.push(FALLBACK_NOTE[e.code]);
    raw = analyzeOffline(pages, title);
  }

  const { analysis, rejected } = verifyAgainstSource(raw, pages);
  const mismatch = detectMismatch(analysis.candidate_template, pages);
  const response: AnalyzeResponse = { analysis, engine, model, rejected, warnings, mismatch };
  return NextResponse.json(response);
}

export function GET() {
  const cfg = geminiConfig();
  return NextResponse.json({ gemini: Boolean(cfg.apiKey), model: cfg.apiKey ? cfg.model : null });
}
