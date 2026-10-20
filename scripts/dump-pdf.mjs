// Debug helper: print text extracted by PDF.js (node legacy build) for a PDF.
import { readFileSync } from "node:fs";
const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
const doc = await pdfjs.getDocument({ data: new Uint8Array(readFileSync(process.argv[2])) }).promise;
for (let i = 1; i <= doc.numPages; i++) {
  const c = await (await doc.getPage(i)).getTextContent();
  console.log(`--- page ${i} ---`);
  console.log(c.items.map((it) => it.str + (it.hasEOL ? "\n" : "")).join(""));
}
