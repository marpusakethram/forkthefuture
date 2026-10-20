import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "experiment";
}

/**
 * Bring `el` into view inside its nearest scrollable panel without moving the page.
 * Falls back to normal scrollIntoView when no panel scrolls (e.g. stacked mobile layout).
 */
export function revealInPanel(el: HTMLElement, block: "center" | "nearest" = "center") {
  const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let parent = el.parentElement;
  while (parent && parent !== document.body) {
    const oy = getComputedStyle(parent).overflowY;
    if ((oy === "auto" || oy === "scroll") && parent.scrollHeight > parent.clientHeight) {
      const pr = parent.getBoundingClientRect();
      const er = el.getBoundingClientRect();
      const inView = er.top >= pr.top && er.bottom <= pr.bottom;
      if (block === "nearest" && inView) return;
      const delta = block === "center" ? er.top - pr.top - (pr.height - er.height) / 2 : er.top < pr.top ? er.top - pr.top - 8 : er.bottom - pr.bottom + 8;
      parent.scrollBy({ top: delta, behavior: smooth ? "smooth" : "auto" });
      return;
    }
    parent = parent.parentElement;
  }
  el.scrollIntoView({ block, behavior: smooth ? "smooth" : "auto" });
}
