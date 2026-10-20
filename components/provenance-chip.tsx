import { FileText, SlidersHorizontal, Sparkles } from "lucide-react";
import type { Provenance } from "@/lib/experiment";
import { cn } from "@/lib/utils";

const STYLES: Record<Provenance, { label: string; cls: string; Icon: typeof FileText }> = {
  paper: { label: "From paper", cls: "bg-signal/15 text-trace ring-1 ring-signal/40", Icon: FileText },
  user: { label: "Adjusted", cls: "bg-adjusted/15 text-adjusted ring-1 ring-adjusted/40", Icon: SlidersHorizontal },
  illustrative: { label: "Illustrative", cls: "text-studio-muted ring-1 ring-dashed ring-studio-line border border-dashed border-studio-line", Icon: Sparkles },
};

export function ProvenanceChip({ provenance, page, className }: { provenance: Provenance; page?: number; className?: string }) {
  const s = STYLES[provenance];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", s.cls, className)} data-provenance={provenance}>
      <s.Icon className="size-3" aria-hidden />
      {s.label}
      {provenance === "paper" && page ? `, p. ${page}` : ""}
    </span>
  );
}
