import { readFileSync } from "node:fs";
import { joinTextItems } from "@/lib/pdf/extract";
import type { SourcePage } from "@/lib/ai/extract-schema";

/** Extract page text from a fixture PDF with the same line-joining logic the browser uses. */
export async function fixturePages(file: string): Promise<SourcePage[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjs.getDocument({ data: new Uint8Array(readFileSync(`fixtures/papers/${file}`)), verbosity: 0 }).promise;
  const pages: SourcePage[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const c = await (await doc.getPage(i)).getTextContent();
    pages.push({ page: i, text: joinTextItems(c.items as never) });
  }
  return pages;
}
