import { z } from "zod";

export const CANDIDATE_TEMPLATES = ["robot-arm", "battery-fade", "queue-mm1", "unsupported"] as const;

const short = (n: number) => z.string().max(n);

export const EquationSchema = z.object({
  latex_string: short(400),
  context: short(400),
  source_page: z.number().int().min(1),
  text_span: short(400).min(1),
  units: short(120).nullable().default(null),
  extracted_vs_inferred: z.enum(["extracted", "inferred"]),
});

export const VariableSchema = z.object({
  symbol: short(40),
  meaning: short(200),
  unit: short(40).nullable().default(null),
  domain: short(120).nullable().default(null),
  /** null means "not provided" by the source — never filled in as fact. */
  default_candidate: z.number().finite().nullable().default(null),
  evidence_page: z.number().int().min(1),
  text_span: short(400).min(1),
  maps_to: short(40).nullable().default(null),
});

export const MeasurementSchema = z.object({
  description: short(200),
  value: z.number().finite().nullable().default(null),
  unit: short(40).nullable().default(null),
  source_page: z.number().int().min(1),
  text_span: short(400).min(1),
});

export const PaperAnalysisSchema = z.object({
  title: short(300),
  authors_as_stated: z.array(short(120)).max(30).default([]),
  date_as_stated: short(60).nullable().default(null),
  pages_used: z.array(z.number().int().min(1)).max(40),
  central_question: short(600),
  summary: short(1200).default(""),
  equations: z.array(EquationSchema).max(30).default([]),
  variables: z.array(VariableSchema).max(40).default([]),
  measurements: z.array(MeasurementSchema).max(30).default([]),
  limitations: z.array(short(300)).max(15).default([]),
  candidate_template: z.enum(CANDIDATE_TEMPLATES),
  template_match_confidence: z.number().min(0).max(1),
  template_rationale: short(600).default(""),
  contradictions: z.array(short(300)).max(15).default([]),
});

export type Equation = z.infer<typeof EquationSchema>;
export type Variable = z.infer<typeof VariableSchema>;
export type Measurement = z.infer<typeof MeasurementSchema>;
export type PaperAnalysis = z.infer<typeof PaperAnalysisSchema>;

export interface SourcePage {
  page: number;
  text: string;
}

export type Engine = "gemini" | "offline-rules";

export interface AnalyzeRequest {
  title?: string;
  pages: SourcePage[];
}

export interface RejectedItem {
  kind: "equation" | "variable" | "measurement";
  label: string;
  reason: string;
}

export interface AnalyzeResponse {
  analysis: PaperAnalysis;
  engine: Engine;
  model: string | null;
  rejected: RejectedItem[];
  warnings: string[];
  mismatch: { reason: string } | null;
}

export const AnalyzeRequestSchema = z.object({
  title: z.string().max(300).optional(),
  pages: z
    .array(z.object({ page: z.number().int().min(1).max(10000), text: z.string().max(200_000) }))
    .min(1, "Select at least one page")
    .max(40, "Select at most 40 pages"),
});

/** JSON schema for Gemini's responseSchema (OpenAPI subset). Kept in sync with PaperAnalysisSchema. */
export const GEMINI_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    title: { type: "STRING" },
    authors_as_stated: { type: "ARRAY", items: { type: "STRING" } },
    date_as_stated: { type: "STRING", nullable: true },
    pages_used: { type: "ARRAY", items: { type: "INTEGER" } },
    central_question: { type: "STRING" },
    summary: { type: "STRING" },
    equations: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          latex_string: { type: "STRING" },
          context: { type: "STRING" },
          source_page: { type: "INTEGER" },
          text_span: { type: "STRING" },
          units: { type: "STRING", nullable: true },
          extracted_vs_inferred: { type: "STRING", enum: ["extracted", "inferred"] },
        },
        required: ["latex_string", "context", "source_page", "text_span", "extracted_vs_inferred"],
      },
    },
    variables: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          symbol: { type: "STRING" },
          meaning: { type: "STRING" },
          unit: { type: "STRING", nullable: true },
          domain: { type: "STRING", nullable: true },
          default_candidate: { type: "NUMBER", nullable: true },
          evidence_page: { type: "INTEGER" },
          text_span: { type: "STRING" },
          maps_to: { type: "STRING", nullable: true },
        },
        required: ["symbol", "meaning", "evidence_page", "text_span"],
      },
    },
    measurements: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          description: { type: "STRING" },
          value: { type: "NUMBER", nullable: true },
          unit: { type: "STRING", nullable: true },
          source_page: { type: "INTEGER" },
          text_span: { type: "STRING" },
        },
        required: ["description", "source_page", "text_span"],
      },
    },
    limitations: { type: "ARRAY", items: { type: "STRING" } },
    candidate_template: { type: "STRING", enum: [...CANDIDATE_TEMPLATES] },
    template_match_confidence: { type: "NUMBER" },
    template_rationale: { type: "STRING" },
    contradictions: { type: "ARRAY", items: { type: "STRING" } },
  },
  required: ["title", "pages_used", "central_question", "candidate_template", "template_match_confidence", "equations", "variables"],
} as const;
