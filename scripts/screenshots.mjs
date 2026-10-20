// Captures README screenshots from a running server: node scripts/screenshots.mjs http://localhost:3100
import { chromium } from "@playwright/test";
import { existsSync } from "node:fs";
const base = process.argv[2] ?? "http://localhost:3000";
const exe = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const b = await chromium.launch(existsSync(exe) ? { executablePath: exe } : {});
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(base + "/"); await p.waitForTimeout(800);
await p.screenshot({ path: "docs/screenshots/home.png" });
await p.getByTestId("try-sample").click();
await p.getByTestId("analyze").click();
await p.getByTestId("badge-supported").waitFor();
await p.getByTestId("param-row-L1").getByRole("button").click();
await p.waitForTimeout(500);
await p.screenshot({ path: "docs/screenshots/import.png" });
await p.getByTestId("open-studio").click();
await p.getByTestId("pin-a").click();
await p.getByTestId("input-theta2").fill("100");
await p.getByTestId("evidence-link-L2").click();
await p.waitForTimeout(2800); // let the toast fade
await p.waitForTimeout(900);
await p.screenshot({ path: "docs/screenshots/studio-paper.png" });
await p.goto(base + "/playground/demo-battery"); await p.waitForTimeout(800);
await p.screenshot({ path: "docs/screenshots/battery.png" });
await p.goto(base + "/playground/demo-queue"); await p.waitForTimeout(800);
await p.screenshot({ path: "docs/screenshots/queue.png" });
await b.close();
