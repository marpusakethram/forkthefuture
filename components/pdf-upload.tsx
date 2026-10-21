"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, ClipboardPaste, FileText, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { ASSET_BASE, extractPdf, pagesFromText, PdfExtractError, PDF_LIMITS } from "@/lib/pdf/extract";
import { saveDraft } from "@/lib/store";
import { cn } from "@/lib/utils";

export const SAMPLE_PDF = { url: `${ASSET_BASE}samples/two-link-arm-handout.pdf`, name: "two-link-arm-handout.pdf" };

export function PdfUpload() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pasting, setPasting] = useState(false);
  const [text, setText] = useState("");

  async function handleFile(file: File, kind: "pdf" | "sample" = "pdf") {
    setError(null);
    setBusy(`Reading ${file.name} in your browser…`);
    try {
      const pdf = await extractPdf(file);
      const ok = saveDraft({ kind, fileName: pdf.fileName, sha256: pdf.sha256, numPages: pdf.numPages, pages: pdf.pages, imageOnlyPages: pdf.imageOnlyPages, meta: pdf.meta });
      if (!ok) throw new PdfExtractError("PARSE_FAILED", "Your browser blocked session storage, so the extracted text can't be kept. Allow site data and try again.");
      router.push("/import");
    } catch (e) {
      setBusy(null);
      setError(e instanceof PdfExtractError ? e.message : "Something went wrong reading that file. Try another PDF or paste the text.");
    }
  }

  async function trySample() {
    setError(null);
    setBusy("Loading the sample handout…");
    try {
      const res = await fetch(SAMPLE_PDF.url);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      await handleFile(new File([blob], SAMPLE_PDF.name, { type: "application/pdf" }), "sample");
    } catch {
      setBusy(null);
      setError("The sample handout couldn't be loaded. Reload the page and try again.");
    }
  }

  function submitText() {
    const pages = pagesFromText(text);
    if (!pages.length || text.trim().length < 40) {
      setError("Paste at least a paragraph — an abstract or the section with the equations.");
      return;
    }
    saveDraft({ kind: "text", fileName: null, sha256: null, numPages: pages.length, pages, imageOnlyPages: [], meta: { title: null, author: null } });
    router.push("/import");
  }

  return (
    <div className="w-full">
      {!pasting ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f) void handleFile(f);
          }}
          className={cn(
            "flex flex-col items-center justify-center gap-4 rounded-[var(--radius-panel)] border-2 border-dashed px-6 py-12 text-center transition-colors sm:py-16",
            over ? "border-signal bg-signal-soft" : "border-line bg-mist",
          )}
          data-testid="dropzone"
        >
          {busy ? (
            <p className="flex items-center gap-2 text-base font-medium" role="status">
              <Loader2 className="size-5 animate-spin text-signal" /> {busy}
            </p>
          ) : (
            <>
              <FileUp className="size-9 text-signal" aria-hidden />
              <div>
                <p className="text-lg font-semibold">Drop a research PDF here</p>
                <p className="mt-1 text-sm text-slate">Up to {PDF_LIMITS.maxBytes / 1048576} MB and {PDF_LIMITS.maxPages} pages. Text is read in your browser; you choose which pages get analysed.</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <Button onClick={() => input.current?.click()}>
                  <FileUp /> Choose a PDF
                </Button>
                <Button variant="outline" onClick={trySample} data-testid="try-sample">
                  <FileText /> Try the sample handout
                </Button>
                <Button variant="ghost" onClick={() => setPasting(true)}>
                  <ClipboardPaste /> Paste text instead
                </Button>
              </div>
              <input
                ref={input}
                type="file"
                accept="application/pdf,.pdf"
                className="sr-only"
                data-testid="file-input"
                aria-label="Choose a PDF"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleFile(f);
                  e.target.value = "";
                }}
              />
            </>
          )}
        </div>
      ) : (
        <div className="rounded-[var(--radius-panel)] bg-mist p-4 sm:p-6">
          <label htmlFor="paste" className="mb-2 block font-semibold">Paste an abstract or section</label>
          <textarea
            id="paste"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            placeholder="Paste text here. Separate pages with a line like --- page 2 --- if you want page references."
            className="w-full resize-y rounded-2xl border border-line bg-paper p-4 text-[15px] leading-relaxed outline-none focus:border-signal"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={submitText}>Continue with this text</Button>
            <Button variant="ghost" onClick={() => setPasting(false)}>Back to PDF upload</Button>
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-3 rounded-2xl bg-[#fdecec] px-4 py-3 text-sm text-[#a1262b]" data-testid="upload-error">
          {error}
        </p>
      )}
      <p className="mt-3 text-xs text-slate">
        No sign-in. We don&apos;t fetch papers from URLs — open the publisher&apos;s page, download the PDF, and drop it here. If AI extraction is enabled on this server, the pages you select are sent to Google Gemini&apos;s free tier, which may use them to improve its products. Don&apos;t upload confidential manuscripts.
      </p>
    </div>
  );
}
