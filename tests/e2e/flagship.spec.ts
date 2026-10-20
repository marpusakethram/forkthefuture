import { test, expect, type Page } from "@playwright/test";
import path from "node:path";

const effector = async (page: Page) => {
  const svg = page.getByTestId("arm-svg").first();
  return { x: Number(await svg.getAttribute("data-effector-x")), y: Number(await svg.getAttribute("data-effector-y")) };
};

test("home: hero arm is interactive with no upload", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "What if research papers were playable?" })).toBeVisible();
  const hero = page.getByTestId("hero-arm");
  const before = await effector(page);
  await hero.getByRole("slider", { name: "Elbow angle θ2" }).focus();
  for (let i = 0; i < 10; i++) await page.keyboard.press("ArrowRight");
  await expect(hero.getByTestId("hero-theta2")).toHaveText("60°");
  const after = await effector(page);
  // L1=1, L2=0.7, θ1=35°, θ2=60° → x = cos35 + 0.7 cos95
  expect(after.x).toBeCloseTo(Math.cos((35 * Math.PI) / 180) + 0.7 * Math.cos((95 * Math.PI) / 180), 5);
  expect(after.x).not.toBeCloseTo(before.x, 3);
});

test("one click from home reaches a working simulator", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("hero-open-studio").click();
  await expect(page.getByTestId("studio-title")).toContainText("Two-link planar arm");
  await expect(page.getByTestId("out-hand-x")).toHaveText("0.880 m");
});

test("flagship: sample PDF → evidence → confirm → studio → move θ2 → compare → export", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("try-sample").click();
  await expect(page).toHaveURL(/\/import$/);
  await expect(page.getByText("Choose pages to analyse")).toBeVisible();
  await page.getByTestId("analyze").click();

  await expect(page.getByTestId("badge-supported")).toContainText("Two-link planar arm");
  await expect(page.getByTestId("engine-label")).toHaveText("Offline rule-based extractor — no AI");
  await expect(page.getByTestId("equation-table")).toContainText("Page 1");
  const l1 = page.getByTestId("param-row-L1");
  await expect(l1).toContainText("L1 = 0.5 m");
  await expect(l1).toContainText("p. 2");
  await expect(page.getByTestId("param-row-targetX")).toContainText("Not provided");

  // Clicking the quote highlights the excerpt in the source text.
  await l1.getByRole("button").click();
  await expect(page.locator('mark.evidence[data-active="true"]')).toHaveText("L1 = 0.5 m");

  await page.getByTestId("open-studio").click();
  await expect(page).toHaveURL(/\/playground\/p-/);
  await expect(page.getByTestId("control-L1").locator("[data-provenance]")).toHaveText("From paper, p. 2");
  await expect(page.getByTestId("control-targetX")).toHaveCount(0); // target hidden by default for paper runs
  await expect(page.getByTestId("attribution")).toContainText("CC BY 4.0");

  // Handout pose: x = 0.5 cos30 + 0.3 cos75 = 0.511, y = 0.540
  await expect(page.getByTestId("out-hand-x")).toHaveText("0.511 m");
  await expect(page.getByTestId("out-hand-y")).toHaveText("0.540 m");

  await page.getByTestId("pin-a").click();

  // Parameter → evidence link
  await page.getByTestId("evidence-link-L2").click();
  await expect(page.locator('mark.evidence[data-active="true"]')).toHaveText("L2 = 0.3 m");

  // Move θ2 with the keyboard; output and drawing follow the exact FK.
  await page.getByTestId("control-theta2").getByRole("slider").focus();
  for (let i = 0; i < 45; i++) await page.keyboard.press("ArrowLeft");
  await expect(page.getByTestId("input-theta2")).toHaveValue("0");
  await expect(page.getByTestId("out-hand-x")).toHaveText(`${(0.8 * Math.cos(Math.PI / 6)).toFixed(3)} m`);
  await expect(page.getByTestId("control-theta2").locator("[data-provenance]")).toHaveText("Adjusted");
  await expect(page.getByTestId("control-theta2")).toContainText("paper: 45 deg");
  await expect.poll(async () => (await effector(page)).y).toBeCloseTo(0.4, 5);

  await expect(page.getByTestId("compare")).toContainText("Pinned A");
  await expect(page.getByTestId("compare")).toContainText("0.511 m");

  const [json] = await Promise.all([page.waitForEvent("download"), page.getByTestId("export-json").click()]);
  const scenario = JSON.parse(await (await import("node:fs/promises")).readFile((await json.path())!, "utf8"));
  expect(scenario.model.id).toBe("robot-arm-2link");
  expect(scenario.parameters.find((p: { key: string }) => p.key === "L1").provenance).toBe("paper");
  expect(scenario.parameters.find((p: { key: string }) => p.key === "theta2").provenance).toBe("user");

  const [html] = await Promise.all([page.waitForEvent("download"), page.getByTestId("export-html").click()]);
  expect(html.suggestedFilename()).toMatch(/\.html$/);
  const [png] = await Promise.all([page.waitForEvent("download"), page.getByTestId("export-png").click()]);
  expect(png.suggestedFilename()).toMatch(/\.png$/);

  // Reset restores the confirmed paper values.
  await page.getByTestId("reset-all").click();
  await expect(page.getByTestId("out-hand-x")).toHaveText("0.511 m");
});

test("unsupported paper cannot masquerade as a simulation", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("file-input").setInputFiles(path.resolve("fixtures/papers/unsupported-ecology-note.pdf"));
  await page.getByTestId("analyze").click();
  await expect(page.getByTestId("badge-unsupported")).toBeVisible();
  await expect(page.getByTestId("unsupported-panel")).toContainText("Nothing from this source will be run as a simulation");
  await expect(page.getByTestId("open-studio")).toHaveCount(0);
});

test("battery note maps values; queue goes unstable at λ ≥ μ", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("file-input").setInputFiles(path.resolve("fixtures/papers/battery-fade-note.pdf"));
  await page.getByTestId("analyze").click();
  await expect(page.getByTestId("param-row-Q0")).toContainText("rated capacity of 2.5 Ah");
  await page.getByTestId("open-studio").click();
  await expect(page.getByTestId("battery-chart")).toHaveAttribute("data-n80", "447");
  await expect(page.getByTestId("out-cycles-until-80-end-of-life")).toHaveText("447");

  await page.goto("/playground/demo-queue");
  await page.getByTestId("input-lambda").fill("10");
  await expect(page.getByTestId("queue-chart")).toHaveAttribute("data-stable", "false");
  await expect(page.getByTestId("out-average-time-per-request-w")).toHaveText("Unstable — no steady state");
});

test("pasted text with a nonlinear model shows the mismatch warning", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Paste text instead" }).click();
  await page.getByLabel("Paste an abstract or section").fill(
    "Lithium-ion battery capacity fade over cycle life. We fit a square-root model of capacity retention driven by SEI growth. The cell has a rated capacity of 3 Ah and was cycled for 800 cycles. Capacity retention fell to 85% after 800 cycles.",
  );
  await page.getByRole("button", { name: "Continue with this text" }).click();
  await page.getByTestId("analyze").click();
  await expect(page.getByTestId("mismatch-banner")).toContainText("Not an implementation of the paper’s model");
  await page.getByTestId("open-studio").click();
  await expect(page.getByTestId("studio-mismatch")).toBeVisible();
});

test("upload errors are explained", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("file-input").setInputFiles({ name: "notes.pdf", mimeType: "application/pdf", buffer: Buffer.from("this is not a pdf") });
  await expect(page.getByTestId("upload-error")).toContainText(/couldn't be read as a PDF|couldn't parse/);
  await page.getByTestId("file-input").setInputFiles({ name: "huge.pdf", mimeType: "application/pdf", buffer: Buffer.alloc(11 * 1024 * 1024) });
  await expect(page.getByTestId("upload-error")).toContainText("The limit is 10 MB");
});
