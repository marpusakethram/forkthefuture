// Generates the self-authored, CC BY 4.0 sample handouts used by the demo and tests.
// Run: npm run fixtures
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { writeFileSync, mkdirSync } from "node:fs";

interface Doc {
  file: string;
  title: string;
  pages: string[][];
}

const FOOTER = "ForkTheFuture sample handout. Self-authored for this repository. License: CC BY 4.0.";

// pdf-lib's standard fonts only cover WinAnsi, so Greek letters are spelled out (theta1, lambda, mu).
const docs: Doc[] = [
  {
    file: "two-link-arm-handout.pdf",
    title: "Forward Kinematics of a Two-Link Planar Arm",
    pages: [
      [
        "Forward Kinematics of a Two-Link Planar Arm",
        "Authors: ForkTheFuture Example Lab",
        "Date: Oct 2026",
        "",
        "This handout derives the end-effector position of a two-link planar arm",
        "from its joint angles. We assume rigid links and revolute joints, and we",
        "neglect masses, torques and joint limits.",
        "",
        "The elbow position follows from the shoulder angle:",
        "x1 = L1 cos(theta1)",
        "y1 = L1 sin(theta1)",
        "",
        "The end-effector position adds the second link, measured relative to the first:",
        "x = L1 cos(theta1) + L2 cos(theta1 + theta2)    (1)",
        "y = L1 sin(theta1) + L2 sin(theta1 + theta2)    (2)",
      ],
      [
        "Worked example",
        "",
        "Our bench arm has L1 = 0.5 m and L2 = 0.3 m.",
        "In the reference pose the shoulder is at theta1 = 30 deg and the elbow at theta2 = 45 deg.",
        "",
        "The reachable workspace is an annulus with inner radius |L1 - L2| and outer",
        "radius L1 + L2. With the values above the arm reaches between 0.2 m and 0.8 m.",
        "",
        "Limitation: this kinematic model does not account for link deflection or",
        "joint backlash, so measured positions on hardware will differ by a few millimetres.",
      ],
    ],
  },
  {
    file: "battery-fade-note.pdf",
    title: "Capacity Fade of a Li-ion Cell Under Repeated Cycling",
    pages: [
      [
        "Capacity Fade of a Li-ion Cell Under Repeated Cycling",
        "Authors: ForkTheFuture Example Lab",
        "Date: Oct 2026",
        "",
        "This note models capacity retention of a lithium-ion cell as a geometric",
        "decay over cycle number. Battery capacity fade is summarised by a constant",
        "fractional loss per cycle.",
        "",
        "Q(n) = Q0 (1 - d)^n",
        "",
        "The cell has a rated capacity of 2.5 Ah and we use d = 0.0005 per cycle.",
        "The cell was cycled for 1000 cycles at room temperature.",
        "We observed 61% capacity retention after 1000 cycles in the model run.",
        "End of life is defined as 80% capacity retention.",
        "",
        "Limitation: the model assumes identical cycles and does not include",
        "calendar ageing or temperature effects.",
      ],
    ],
  },
  {
    file: "inference-queue-note.pdf",
    title: "Why Inference Latency Explodes Near Full Utilization",
    pages: [
      [
        "Why Inference Latency Explodes Near Full Utilization",
        "Authors: ForkTheFuture Example Lab",
        "",
        "We model a single GPU inference server as an M/M/1 queue. Requests arrive",
        "as a Poisson process and service times are exponential.",
        "",
        "rho = lambda / mu",
        "W = 1 / (mu - lambda)",
        "Wq = lambda / (mu (mu - lambda))",
        "",
        "The server has a service rate of 12 requests per second and sees an arrival",
        "rate of 9 requests per second at peak, giving utilization of 0.75.",
        "",
        "Limitation: real inference servers batch requests, so this single-queue",
        "approximation only illustrates the shape of the latency curve.",
      ],
    ],
  },
  {
    file: "unsupported-ecology-note.pdf",
    title: "Pollinator Visits Across a Meadow Transect",
    pages: [
      [
        "Pollinator Visits Across a Meadow Transect",
        "Authors: ForkTheFuture Example Lab",
        "",
        "We counted bee and hoverfly visits to clover along a 200 metre transect",
        "over six summer mornings. Visits peaked mid-morning and declined after",
        "light rain. Species richness was higher near the hedgerow edge.",
        "",
        "This note is descriptive field data and contains no kinematic, battery or",
        "queueing model.",
      ],
    ],
  },
];

async function build(doc: Doc): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(doc.title);
  pdf.setAuthor("ForkTheFuture Example Lab");
  pdf.setSubject("CC BY 4.0 sample handout");
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  for (const lines of doc.pages) {
    const page = pdf.addPage([595, 842]);
    let y = 780;
    lines.forEach((line, i) => {
      const isTitle = i === 0;
      page.drawText(line, { x: 56, y, size: isTitle ? 16 : 11, font: isTitle ? bold : font, color: rgb(0.1, 0.12, 0.16) });
      y -= isTitle ? 28 : 18;
    });
    page.drawText(FOOTER, { x: 56, y: 40, size: 8, font, color: rgb(0.4, 0.42, 0.46) });
  }
  return pdf.save();
}

mkdirSync("fixtures/papers", { recursive: true });
mkdirSync("public/samples", { recursive: true });
for (const d of docs) {
  const bytes = await build(d);
  writeFileSync(`fixtures/papers/${d.file}`, bytes);
  writeFileSync(`public/samples/${d.file}`, bytes);
  console.log("wrote", d.file, bytes.length, "bytes");
}

// Oversized and protected-looking edge cases are produced in tests at runtime, not stored.
