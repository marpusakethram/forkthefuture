// Browser-only persistence. Experiments live on this device; nothing is synced to a server.
import type { Experiment } from "./experiment";
import type { SourcePage } from "@/lib/ai/extract-schema";

const EXP_PREFIX = "ftf:experiment:";
const DRAFT_KEY = "ftf:import-draft";

export interface ImportDraft {
  kind: "pdf" | "text" | "sample";
  fileName: string | null;
  sha256: string | null;
  numPages: number;
  pages: SourcePage[];
  imageOnlyPages: number[];
  meta: { title: string | null; author: string | null };
}

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

export function saveExperiment(e: Experiment): void {
  safe(() => localStorage.setItem(EXP_PREFIX + e.id, JSON.stringify(e)), undefined);
}

export function loadExperiment(id: string): Experiment | null {
  return safe(() => {
    const raw = localStorage.getItem(EXP_PREFIX + id);
    return raw ? (JSON.parse(raw) as Experiment) : null;
  }, null);
}

export function saveDraft(d: ImportDraft): boolean {
  return safe(() => {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(d));
    return true;
  }, false);
}

export function loadDraft(): ImportDraft | null {
  return safe(() => {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as ImportDraft) : null;
  }, null);
}
