import { z } from "zod";
import { TEMPLATES, type TemplateId } from "./templates";

/** Builds a zod schema for a template's numeric parameters from its declared ranges. */
export function paramSchema(id: TemplateId) {
  const shape: Record<string, z.ZodNumber> = {};
  for (const p of TEMPLATES[id].params) {
    shape[p.key] = z
      .number({ invalid_type_error: `${p.label} must be a number` })
      .finite(`${p.label} must be finite`)
      .min(p.min, `${p.label} must be ≥ ${p.min} ${p.unit}`)
      .max(p.max, `${p.label} must be ≤ ${p.max} ${p.unit}`);
  }
  return z.object(shape);
}

export type ParamCheck = { ok: true } | { ok: false; errors: Record<string, string> };

export function checkParams(id: TemplateId, values: Record<string, number>): ParamCheck {
  const res = paramSchema(id).safeParse(values);
  if (res.success) return { ok: true };
  const errors: Record<string, string> = {};
  for (const issue of res.error.issues) errors[String(issue.path[0])] = issue.message;
  return { ok: false, errors };
}

/** Validate one value against its parameter range. Returns an error message or null. */
export function checkParam(id: TemplateId, key: string, value: number): string | null {
  const p = TEMPLATES[id].params.find((x) => x.key === key);
  if (!p) return `Unknown parameter ${key}`;
  if (!Number.isFinite(value)) return `${p.label} must be a number`;
  if (value < p.min || value > p.max) return `${p.label} must be between ${p.min} and ${p.max} ${p.unit}`;
  return null;
}
