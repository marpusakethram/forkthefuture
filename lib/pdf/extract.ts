// Browser-local PDF text extraction with PDF.js. Nothing is uploaded until the user
// chooses pages and clicks Analyze.

import type { SourcePage } from "@/lib/ai/extract-schema";

/** Where static assets live. "/" for the Next app; "" (page-relative) for the standalone preview build. */
export const ASSET_BASE = process.env.NEXT_PUBLIC_ASSET_BASE ?? "/";

export const PDF_LIMITS = { maxBytes: 10 * 1024 * 1024, maxPages: 40, minCharsPerPage: 20 };

export type PdfErrorCode = "TOO_LARGE" | "TOO_MANY_PAGES" | "PROTECTED" | "NO_TEXT" | "NOT_PDF" | "PARSE_FAILED";

export class PdfExtractError extends Error {
  constructor(public code: PdfErrorCode, message: string) {
    super(message);
  }
}

export interface ExtractedPdf {
  fileName: string;
  numPages: number;
  pages: SourcePage[];
  sha256: string;
  meta: { title: string | null; author: string | null };
  imageOnlyPages: number[];
}

async function sha256Hex(buf: ArrayBuffer): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

interface TextItemLike {
  str: string;
  hasEOL?: boolean;
  transform?: number[];
}

/** Join PDF.js text items into lines, breaking when the baseline moves or the item ends a line. */
export function joinTextItems(items: TextItemLike[]): string {
  let out = "";
  let lastY: number | null = null;
  for (const it of items) {
    const y = it.transform ? it.transform[5] : null;
    if (lastY !== null && y !== null && Math.abs(y - lastY) > 2 && !out.endsWith("\n")) out += "\n";
    out += it.str;
    if (it.hasEOL && !out.endsWith("\n")) out += "\n";
    if (y !== null) lastY = y;
  }
  return out.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

export async function extractPdf(file: File): Promise<ExtractedPdf> {
  if (file.size > PDF_LIMITS.maxBytes)
    throw new PdfExtractError("TOO_LARGE", `This file is ${(file.size / 1048576).toFixed(1)} MB. The limit is 10 MB — compress it or paste the relevant section as text.`);
  if (file.type && file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf"))
    throw new PdfExtractError("NOT_PDF", "That file isn't a PDF. Upload a .pdf or paste text instead.");

  const buf = await file.arrayBuffer();
  const sha256 = await sha256Hex(buf.slice(0));
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = `${ASSET_BASE}pdf.worker.min.mjs`;

  let doc;
  try {
    doc = await pdfjs.getDocument({ data: new Uint8Array(buf), isEvalSupported: false }).promise;
  } catch (e) {
    const name = (e as { name?: string })?.name;
    if (name === "PasswordException")
      throw new PdfExtractError("PROTECTED", "This PDF is password-protected. Remove the password in your PDF reader, or paste the text you want analysed.");
    if (name === "InvalidPDFException")
      throw new PdfExtractError("NOT_PDF", "This file couldn't be read as a PDF. It may be corrupted — try re-exporting it.");
    throw new PdfExtractError("PARSE_FAILED", "PDF.js couldn't parse this file. Paste the text instead.");
  }

  try {
    if (doc.numPages > PDF_LIMITS.maxPages)
      throw new PdfExtractError("TOO_MANY_PAGES", `This PDF has ${doc.numPages} pages; the limit is ${PDF_LIMITS.maxPages}. Split out the relevant pages or paste the section as text.`);

    const pages: SourcePage[] = [];
    const imageOnlyPages: number[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const text = joinTextItems(content.items as TextItemLike[]);
      if (text.replace(/\s/g, "").length < PDF_LIMITS.minCharsPerPage) imageOnlyPages.push(i);
      pages.push({ page: i, text });
    }
    if (imageOnlyPages.length === doc.numPages)
      throw new PdfExtractError("NO_TEXT", "No selectable text found — this looks like a scanned or image-only PDF. Run OCR first, or paste the text.");

    let meta = { title: null as string | null, author: null as string | null };
    try {
      const m = await doc.getMetadata();
      const info = m.info as { Title?: string; Author?: string };
      meta = { title: info?.Title?.trim() || null, author: info?.Author?.trim() || null };
    } catch {
      /* metadata is optional */
    }
    return { fileName: file.name, numPages: doc.numPages, pages, sha256, meta, imageOnlyPages };
  } finally {
    void doc.destroy();
  }
}

/** Pasted text: split on form feeds or "--- page N ---" markers, else one page. */
export function pagesFromText(text: string): SourcePage[] {
  const parts = text.split(/\f|^-{3,}\s*page\s*\d+\s*-{3,}$/gim).map((t) => t.trim()).filter(Boolean);
  return parts.slice(0, PDF_LIMITS.maxPages).map((t, i) => ({ page: i + 1, text: t }));
}
