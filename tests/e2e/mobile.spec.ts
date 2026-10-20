import { test, expect } from "@playwright/test";

test("mobile: no horizontal scroll and the studio stacks", async ({ page }) => {
  for (const url of ["/", "/playground/demo-arm", "/playground/demo-battery"]) {
    await page.goto(url);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, url).toBeLessThanOrEqual(1);
  }
  await page.goto("/playground/demo-arm");
  await expect(page.getByTestId("arm-svg")).toBeVisible();
  await expect(page.getByTestId("control-theta2")).toBeVisible();
});
