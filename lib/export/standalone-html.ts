// Self-contained, offline HTML export: inline CSS + a small pure-JS copy of the template math.
// No network requests, no external scripts, no generated code from any AI.
import type { Experiment } from "@/lib/experiment";
import { TEMPLATES } from "@/lib/models/templates";
import { attributionLine, buildScenario } from "./scenario";

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Plain-text renderings of the template equations (KaTeX would need its fonts/CSS). */
const PLAIN_EQUATIONS: Record<string, string[]> = {
  "robot-arm": ["x = L1·cos(θ1) + L2·cos(θ1 + θ2)", "y = L1·sin(θ1) + L2·sin(θ1 + θ2)"],
  "battery-fade": ["Q(n) = Q0·(1 − d)^n   (geometric)", "Q(n) = max(0, Q0 − k·n)   (linear)"],
  "queue-mm1": ["ρ = λ / μ", "W = 1 / (μ − λ)   (only when λ < μ)", "Wq = λ / (μ(μ − λ))"],
};

/** Pure JS kept deliberately tiny so a reader can audit it. Mirrors lib/models/*.ts. */
export const STANDALONE_MODEL_JS = String.raw`
function ftfCompute(template, v, opts) {
  var rad = Math.PI / 180;
  if (template === "robot-arm") {
    var ex = v.L1 * Math.cos(v.theta1 * rad), ey = v.L1 * Math.sin(v.theta1 * rad);
    var x = ex + v.L2 * Math.cos((v.theta1 + v.theta2) * rad), y = ey + v.L2 * Math.sin((v.theta1 + v.theta2) * rad);
    return { elbow: [ex, ey], effector: [x, y], reach: Math.hypot(x, y) };
  }
  if (template === "battery-fade") {
    var pts = [], n80 = null;
    for (var n = 0; n <= v.nMax; n++) {
      var q = opts.fadeMode === "linear"
        ? Math.max(0, v.Q0 - v.k * v.tempFactor * n)
        : v.Q0 * Math.pow(1 - Math.min(v.d * v.tempFactor, 0.999999), n);
      pts.push(q);
      if (n80 === null && q / v.Q0 <= 0.8) n80 = n;
    }
    return { curve: pts, n80: n80 };
  }
  if (v.lambda >= v.mu) return { stable: false, rho: v.lambda / v.mu };
  return { stable: true, rho: v.lambda / v.mu, W: 1 / (v.mu - v.lambda), Wq: v.lambda / (v.mu * (v.mu - v.lambda)) };
}
`;

const RENDER_JS = String.raw`
(function () {
  var data = JSON.parse(document.getElementById("ftf-data").textContent);
  var v = {}; data.parameters.forEach(function (p) { v[p.key] = p.value; });
  var svg = document.getElementById("plot"), NS = "http://www.w3.org/2000/svg";
  function el(n, a) { var e = document.createElementNS(NS, n); for (var k in a) e.setAttribute(k, a[k]); svg.appendChild(e); return e; }
  function draw() {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    var r = ftfCompute(data.template, v, data.options), out = document.getElementById("out");
    if (data.template === "robot-arm") {
      var R = (v.L1 + v.L2) * 1.15, s = 180 / R, cx = 200, cy = 200;
      function P(p) { return [cx + p[0] * s, cy - p[1] * s]; }
      el("circle", { cx: cx, cy: cy, r: (v.L1 + v.L2) * s, fill: "none", stroke: "#c9d3dd", "stroke-dasharray": "4 4" });
      var e = P(r.elbow), f = P(r.effector);
      el("polyline", { points: cx + "," + cy + " " + e.join(",") + " " + f.join(","), fill: "none", stroke: "#0866ff", "stroke-width": 6, "stroke-linecap": "round", "stroke-linejoin": "round" });
      [[cx, cy], e, f].forEach(function (p) { el("circle", { cx: p[0], cy: p[1], r: 7, fill: "#1c2b33" }); });
      out.textContent = "x = " + r.effector[0].toFixed(3) + " m, y = " + r.effector[1].toFixed(3) + " m, reach = " + r.reach.toFixed(3) + " m";
    } else if (data.template === "battery-fade") {
      var c = r.curve, d = "";
      c.forEach(function (q, i) { d += (i ? "L" : "M") + (20 + 360 * i / (c.length - 1)).toFixed(1) + "," + (380 - 360 * q / v.Q0).toFixed(1); });
      el("line", { x1: 20, x2: 380, y1: 380 - 360 * 0.8, y2: 380 - 360 * 0.8, stroke: "#c0392b", "stroke-dasharray": "5 4" });
      el("path", { d: d, fill: "none", stroke: "#0866ff", "stroke-width": 3 });
      out.textContent = "Capacity at cycle " + v.nMax + ": " + c[c.length - 1].toFixed(3) + " Ah. Cycles to 80%: " + (r.n80 === null ? "not reached" : r.n80);
    } else {
      var max = v.mu * 1.15, pts = "";
      for (var i = 0; i <= 200; i++) { var l = max * i / 200; if (l >= v.mu) break; var w = 1 / (v.mu - l); pts += (20 + 360 * l / max).toFixed(1) + "," + Math.max(20, 380 - 360 * w / (20 / v.mu)).toFixed(1) + " "; }
      el("polyline", { points: pts, fill: "none", stroke: "#0866ff", "stroke-width": 3 });
      var xm = 20 + 360 * v.mu / max; el("line", { x1: xm, x2: xm, y1: 20, y2: 380, stroke: "#c0392b", "stroke-dasharray": "5 4" });
      out.textContent = r.stable ? "ρ = " + r.rho.toFixed(3) + ", W = " + (r.W * 1000).toFixed(1) + " ms, Wq = " + (r.Wq * 1000).toFixed(1) + " ms" : "Unstable: λ ≥ μ, the queue grows without bound (ρ = " + r.rho.toFixed(3) + ")";
    }
  }
  data.parameters.forEach(function (p) {
    var inp = document.getElementById("in-" + p.key); if (!inp) return;
    inp.addEventListener("input", function () { var n = parseFloat(inp.value); if (isFinite(n)) { v[p.key] = n; draw(); } });
  });
  draw();
})();
`;

export function buildStandaloneHtml(e: Experiment): string {
  const t = TEMPLATES[e.template];
  const scenario = buildScenario(e);
  const data = { template: e.template, options: e.options, parameters: scenario.parameters };
  const rows = scenario.parameters
    .map((p) => {
      const def = t.params.find((d) => d.key === p.key)!;
      const prov =
        p.provenance === "paper"
          ? `From source, p. ${p.evidence?.page}: “${esc(p.evidence?.span ?? "")}”`
          : p.provenance === "user"
            ? `Adjusted by user${p.paperValue !== null ? ` (source states ${p.paperValue})` : ""}`
            : "Illustrative sample value";
      return `<tr><td>${esc(p.label)}</td><td><input id="in-${p.key}" type="number" value="${p.value}" min="${def.min}" max="${def.max}" step="${def.step}"> ${esc(p.unit)}</td><td>${prov}</td></tr>`;
    })
    .join("");
  const mismatch = scenario.source?.modelMismatch
    ? `<p class="warn"><strong>Not an implementation of the paper’s model.</strong> ${esc(scenario.source.modelMismatch)}</p>`
    : "";
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(t.name)} — ForkTheFuture export</title>
<style>
body{font:15px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif;color:#1c2b33;background:#fff;margin:0;padding:24px;max-width:860px;margin:auto}
h1{font-size:24px;margin:0 0 4px}.muted{color:#5d6c7b}.warn{background:#fff4e0;border-radius:12px;padding:12px 14px}
table{width:100%;border-collapse:collapse;margin:16px 0}td{border-top:1px solid #e3e8ee;padding:8px 6px;vertical-align:top}
input{width:110px;font:inherit;padding:4px 6px;border:1px solid #c9d3dd;border-radius:8px}
pre{background:#f1f4f7;border-radius:12px;padding:12px;white-space:pre-wrap}svg{background:#f6f8fa;border-radius:16px;max-width:100%}
#out{font-variant-numeric:tabular-nums;font-weight:600}
</style></head><body>
<h1>${esc(t.name)}</h1>
<p class="muted">Model ${esc(t.modelId)} v${esc(t.version)} · exported ${esc(scenario.exportedAt)}</p>
<p><strong>Source:</strong> ${esc(attributionLine(e))}</p>
${mismatch}
<h2>Equations evaluated (template, not quoted from the source)</h2>
<pre>${PLAIN_EQUATIONS[e.template].map(esc).join("\n")}</pre>
<svg id="plot" viewBox="0 0 400 400" width="400" height="400" role="img" aria-label="Simulation plot"></svg>
<p id="out" aria-live="polite"></p>
<table><tbody>${rows}</tbody></table>
<h2>Limits</h2><ul>${t.assumptions.map((a) => `<li>${esc(a)}</li>`).join("")}</ul>
<p class="muted">${esc(scenario.statement)}</p>
<script type="application/json" id="ftf-data">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>
<script>${STANDALONE_MODEL_JS}${RENDER_JS}</script>
</body></html>`;
}
