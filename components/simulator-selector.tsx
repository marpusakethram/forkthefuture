"use client";
import { TEMPLATES, TEMPLATE_IDS, type CandidateTemplate, type TemplateId } from "@/lib/models/templates";
import { cn } from "@/lib/utils";

/** Lets the user confirm the recommended template or pick another supported one. */
export function SimulatorSelector({
  recommended,
  value,
  onChange,
}: {
  recommended: CandidateTemplate;
  value: TemplateId | null;
  onChange: (t: TemplateId) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Simulation template" className="grid gap-3 sm:grid-cols-3">
      {TEMPLATE_IDS.map((id) => {
        const t = TEMPLATES[id];
        const active = value === id;
        return (
          <button
            key={id}
            role="radio"
            aria-checked={active}
            onClick={() => onChange(id)}
            className={cn(
              "rounded-2xl border p-4 text-left transition-colors",
              active ? "border-signal bg-signal-soft" : "border-line bg-paper hover:border-slate",
            )}
            data-testid={`template-${id}`}
          >
            <span className="flex items-center justify-between gap-2">
              <span className="font-semibold">{t.name}</span>
              {recommended === id && <span className="rounded-full bg-signal px-2 py-0.5 text-[11px] font-semibold text-white">Recommended</span>}
            </span>
            <span className="mt-1 block text-sm text-slate">{t.short}</span>
          </button>
        );
      })}
    </div>
  );
}
