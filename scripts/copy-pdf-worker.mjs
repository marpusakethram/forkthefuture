// Copies the PDF.js worker into /public so the browser can load it without a CDN.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
try {
  const src = require.resolve("pdfjs-dist/build/pdf.worker.min.mjs");
  const dest = path.join(process.cwd(), "public", "pdf.worker.min.mjs");
  if (!existsSync(path.dirname(dest))) mkdirSync(path.dirname(dest), { recursive: true });
  copyFileSync(src, dest);
  console.log("[postinstall] copied pdf.worker.min.mjs to public/");
} catch {
  console.warn("[postinstall] pdfjs-dist not installed yet; skipping worker copy");
}
