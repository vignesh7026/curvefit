import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// WCAG 2.1 AA scan of the quiz, checkout path and every customer page (PRD non-functional
// requirement). Automated checks catch a subset of issues; they do not replace a manual audit.
const PAGES: Array<[string, string]> = [
  ["home", "/"],
  ["shop", "/shop"],
  ["product with size quiz and reviews", "/products/high-rise-squat-proof-legging"],
  ["cart", "/cart"],
  ["exchange", "/exchange"],
  ["track", "/track"],
  ["size guide", "/size-guide"],
  ["waitlist", "/waitlist"],
  ["returns", "/returns"],
  ["privacy", "/privacy"],
  ["shipping", "/shipping"],
  ["terms", "/terms"],
  ["contact", "/contact"],
  ["login", "/login"],
  ["sign up", "/signup"],
  ["forgot password", "/account/forgot"],
  ["reset password", "/account/reset?token=" + "a".repeat(64)],
  ["team sign in", "/admin/login"],
  ["team sign up", "/admin/signup"],
  ["about", "/about"],
  ["demo checkout", "/checkout/demo"],
  ["admin sign in", "/admin"],
];

for (const [name, path] of PAGES) {
  test(`no serious accessibility violations: ${name}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const serious = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );
    expect(
      serious.map((v) => `${v.id}: ${v.help} (${v.nodes.length} nodes)`),
      JSON.stringify(
        serious.map((v) => v.nodes.map((n) => n.html)),
        null,
        1,
      ),
    ).toEqual([]);
  });
}

test("the size quiz can be completed with the keyboard alone", async ({ page }) => {
  await page.goto("/products/high-rise-squat-proof-legging");
  await page.locator("#height").focus();
  await page.keyboard.type("165");
  await page.keyboard.press("Tab");
  await page.keyboard.type("112");
  await page.keyboard.press("Tab");
  await page.keyboard.type("100");
  await page.keyboard.press("Tab");
  await page.keyboard.type("120");
  await page.keyboard.press("Enter"); // submits the form
  await expect(page.getByText("We recommend 2XL")).toBeVisible();
});
