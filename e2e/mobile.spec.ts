import { expect, test } from "@playwright/test";
import { openLegging, runSizeFinder } from "./helpers";

// PRD non-functional requirement: largest contentful paint under 2.5 s on a mid-range phone over
// 4G. Measured against a local production build with network and CPU throttled, so it checks our
// page weight and render path, not hosting or CDN speed. Real-device numbers still need checking.
for (const path of ["/", "/shop", "/products/high-rise-squat-proof-legging"]) {
  test(`largest contentful paint stays under 2.5 s on throttled 4G: ${path}`, async ({
    page,
    context,
  }) => {
    const cdp = await context.newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 150,
      downloadThroughput: (1.6 * 1024 * 1024) / 8,
      uploadThroughput: (750 * 1024) / 8,
    });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await page.addInitScript(() => {
      (window as unknown as { __lcp: number }).__lcp = 0;
      new PerformanceObserver((list) => {
        for (const e of list.getEntries())
          (window as unknown as { __lcp: number }).__lcp = e.startTime;
      }).observe({ type: "largest-contentful-paint", buffered: true });
    });
    await page.goto(path, { waitUntil: "load" });
    await page.waitForTimeout(800);
    const lcp = await page.evaluate(() => (window as unknown as { __lcp: number }).__lcp);
    console.warn(`LCP ${path}: ${Math.round(lcp)} ms`);
    expect(lcp).toBeGreaterThan(0);
    expect(lcp).toBeLessThan(2500);
  });
}

test("the shopping path works on a phone with no sideways scrolling", async ({ page }) => {
  const noOverflow = async () =>
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);

  await openLegging(page);
  await noOverflow();

  await runSizeFinder(page, { height: "165", bust: "112", waist: "100", hip: "120" });
  await expect(page.getByText("We recommend 2XL")).toBeVisible();
  await page.getByRole("button", { name: "Add 2XL to cart" }).click();
  await noOverflow();

  await page.goto("/cart");
  await expect(page.getByText("Size 2XL")).toBeVisible();
  await noOverflow();

  for (const path of [
    "/shop",
    "/size-guide",
    "/exchange",
    "/login",
    "/signup",
    "/about",
    "/admin/login",
  ]) {
    await page.goto(path);
    await noOverflow();
  }
});
