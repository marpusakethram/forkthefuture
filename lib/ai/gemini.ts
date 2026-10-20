import "server-only";
import { createHash } from "node:crypto";
import { GEMINI_RESPONSE_SCHEMA, PaperAnalysisSchema, type PaperAnalysis, type SourcePage } from "./extract-schema";

/** Free-tier models only. Anything else in GEMINI_MODEL is refused. */
export const GEMINI_MODEL_ALLOWLIST = ["gemini-2.5-flash-lite", "gemini-2.5-flash", "gemini-2.0-flash"] as const;

export class GeminiError extends Error {
  constructor(
    message: string,
    public code: "NO_KEY" | "MODEL_NOT_ALLOWED" | "QUOTA" | "BUDGET" | "TOO_LARGE" | "BAD_OUTPUT" | "UPSTREAM",
  ) {
    super(message);
  }
}

function intEnv(name: string, fallback: number): number {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : fallback;
}

export function geminiConfig() {
  const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash-lite";
  return {
    apiKey: process.env.GEMINI_API_KEY?.trim() || "",
    model,
    maxInputChars: intEnv("GEMINI_MAX_INPUT_CHARS", 60_000),
    maxOutputTokens: intEnv("GEMINI_MAX_OUTPUT_TOKENS", 4096),
    dailyCap: intEnv("GEMINI_DAILY_CALL_CAP", 200),
  };
}

const cache = new Map<string, PaperAnalysis>();
const usage = { day: "", calls: 0 };

const SYSTEM_PROMPT = `You classify and extract structured evidence from scientific text for an educational simulator.
Rules:
- Choose candidate_template from exactly: robot-arm (2-link planar forward kinematics), battery-fade (capacity vs cycle number), queue-mm1 (single-server queue latency vs load), unsupported.
- If the text does not clearly fit one template, answer "unsupported". Do not stretch.
- Every equation, variable and measurement MUST quote text_span copied verbatim (character for character) from the page given in source_page/evidence_page. Never paraphrase a span.
- If a constant is not stated in the text, set default_candidate to null. Never fill in typical values.
- maps_to must be one of the template's parameter keys or null: robot-arm: L1, L2, theta1, theta2, targetX, targetY; battery-fade: Q0, d, k, nMax, tempFactor; queue-mm1: lambda, mu.
- default_candidate must be in canonical units: metres, degrees, Ah, fraction per cycle (not percent), requests per second.
- Set extracted_vs_inferred to "inferred" for any LaTeX you reconstructed rather than transcribed.
- List limitations and any internal contradictions you see. Output JSON only. Never output executable code.`;

function buildUserPrompt(pages: SourcePage[], titleHint?: string): string {
  const body = pages.map((p) => `<page number="${p.page}">\n${p.text}\n</page>`).join("\n");
  return `${titleHint ? `User-provided title: ${titleHint}\n` : ""}Analyse these pages:\n${body}`;
}

export async function analyzeWithGemini(pages: SourcePage[], titleHint?: string): Promise<{ analysis: PaperAnalysis; model: string; cached: boolean }> {
  const cfg = geminiConfig();
  if (!cfg.apiKey) throw new GeminiError("No GEMINI_API_KEY configured", "NO_KEY");
  if (!(GEMINI_MODEL_ALLOWLIST as readonly string[]).includes(cfg.model))
    throw new GeminiError(`Model "${cfg.model}" is not on the free-tier allowlist`, "MODEL_NOT_ALLOWED");

  const totalChars = pages.reduce((n, p) => n + p.text.length, 0);
  if (totalChars > cfg.maxInputChars)
    throw new GeminiError(`Selected pages contain ${totalChars.toLocaleString()} characters; the limit is ${cfg.maxInputChars.toLocaleString()}. Select fewer pages.`, "TOO_LARGE");

  const prompt = buildUserPrompt(pages, titleHint);
  const key = createHash("sha256").update(cfg.model).update(prompt).digest("hex");
  const hit = cache.get(key);
  if (hit) return { analysis: hit, model: cfg.model, cached: true };

  const today = new Date().toISOString().slice(0, 10);
  if (usage.day !== today) Object.assign(usage, { day: today, calls: 0 });
  if (usage.calls >= cfg.dailyCap) throw new GeminiError("Daily Gemini call budget reached on this server", "BUDGET");
  usage.calls++;

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${cfg.model}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": cfg.apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: cfg.maxOutputTokens,
        responseMimeType: "application/json",
        responseSchema: GEMINI_RESPONSE_SCHEMA,
      },
    }),
    signal: AbortSignal.timeout(45_000),
  });

  if (res.status === 429) throw new GeminiError("Gemini free-tier quota exceeded", "QUOTA");
  if (!res.ok) throw new GeminiError(`Gemini returned HTTP ${res.status}`, "UPSTREAM");

  const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!text || text.length > 200_000) throw new GeminiError("Gemini returned an empty or oversized response", "BAD_OUTPUT");

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new GeminiError("Gemini response was not valid JSON", "BAD_OUTPUT");
  }
  const parsed = PaperAnalysisSchema.safeParse(json);
  if (!parsed.success) throw new GeminiError(`Gemini response did not match the schema: ${parsed.error.issues[0]?.message}`, "BAD_OUTPUT");

  cache.set(key, parsed.data);
  return { analysis: parsed.data, model: cfg.model, cached: false };
}
