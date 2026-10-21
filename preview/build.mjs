// Builds the standalone preview into preview/dist: node preview/build.mjs
import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const out = path.join(root, "preview/dist");
rmSync(out, { recursive: true, force: true });
mkdirSync(path.join(out, "samples"), { recursive: true });

await build({
  entryPoints: [path.join(root, "preview/main.tsx")],
  bundle: true,
  format: "esm",
  splitting: false,
  minify: true,
  target: "es2022",
  outfile: path.join(out, "app.js"),
  jsx: "automatic",
  loader: { ".woff2": "file", ".woff": "file", ".ttf": "file" },
  assetNames: "fonts/[name]-[hash]",
  alias: {
    "next/link": path.join(root, "preview/shims/next-link.tsx"),
    "next/navigation": path.join(root, "preview/shims/next-navigation.ts"),
    "@": root,
  },
  define: { "process.env.NEXT_PUBLIC_ASSET_BASE": '""', "process.env.NODE_ENV": '"production"' },
  logLevel: "warning",
});

// Tailwind scans the repo's components for class names.
const css = readFileSync(path.join(root, "app/globals.css"), "utf8");
const result = await postcss([tailwind({ base: root, optimize: { minify: true } })]).process(css, { from: path.join(root, "app/globals.css") });
writeFileSync(path.join(out, "tailwind.css"), result.css);

// The worker has one raw ESC (0x1b) inside a string literal; the artifact host rejects raw control bytes,
// so write it as the equivalent \u001b escape.
writeFileSync(path.join(out, "pdf.worker.min.mjs"), readFileSync(path.join(root, "public/pdf.worker.min.mjs"), "utf8").replaceAll("\u001b", "\\u001b"));
for (const f of ["two-link-arm-handout.pdf", "battery-fade-note.pdf", "inference-queue-note.pdf", "unsupported-ecology-note.pdf"])
  copyFileSync(path.join(root, "public/samples", f), path.join(out, "samples", f));

writeFileSync(
  path.join(out, "index.html"),
  `<title>ForkTheFuture</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="tailwind.css">
<link rel="stylesheet" href="app.css">
<style>html,body{background:#ffffff}body{margin:0}</style>
<div id="ftf-app"></div>
<script type="module" src="app.js"></script>
`,
);
console.log("built preview/dist");
