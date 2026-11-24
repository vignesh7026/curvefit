import { expect, test } from "@playwright/test";
import { ADMIN, openLegging, runSizeFinder, staffSignIn } from "./helpers";

test("a review is held for moderation, approved by staff, then shown", async ({ page }) => {
  const text = `e2e review ${Date.now()}`;

  await openLegging(page);
  await page.getByRole("button", { name: "Write a review" }).click();
  await page.locator("#rv-size").selectOption("3XL");
  await page.locator("#rv-height").fill("170");
  await page.locator("#rv-hip").fill("126");
  await page.locator("#rv-body").fill(text);
  await page.getByRole("button", { name: "Submit review" }).click();
  await expect(page.getByText(/will appear once we have checked it/)).toBeVisible();

  // Not public yet.
  await page.reload();
  await expect(page.getByText(text)).toHaveCount(0);

  // Staff approve it.
  await staffSignIn(page);
  await page.getByRole("tab", { name: "reviews" }).click();
  const card = page.getByRole("listitem").filter({ hasText: text });
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "Approve" }).click();
  await expect(card).toHaveCount(0);

  // Now public.
  await openLegging(page);
  await expect(page.getByText(text)).toBeVisible();
});

test("people-like-me filters reviews by the shopper's own measurements", async ({ page }) => {
  await openLegging(page);
  // Seeded demo reviews: 3XL (h165, hip127), 2XL (h160, hip118) and 5XL (h172, hip143).
  await expect(page.getByText("Finally a waistband that does not roll.")).toBeVisible();

  await runSizeFinder(page, { height: "165", bust: "112", waist: "100", hip: "120" });
  await expect(page.getByText("We recommend 2XL")).toBeVisible();

  await page.getByLabel("People like me").check();
  await expect(page.getByText("[demo] Stays up through squats.")).toBeVisible();
  await expect(page.getByText("Finally a waistband that does not roll.")).toHaveCount(0);

  await page.getByLabel("Size worn").selectOption("2XL");
  await expect(page.getByText("[demo] Great, but I sized up.")).toBeVisible();
  await expect(page.getByText("[demo] Stays up through squats.")).toHaveCount(0);
});

test.describe("staff access", () => {
  test("a wrong password is refused", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Work email").fill(ADMIN.email);
    await page.getByLabel("Password", { exact: true }).fill("not-the-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Invalid email or password.")).toBeVisible();
    await expect(page.getByRole("tab")).toHaveCount(0);
  });

  test("the overview shows exchange stats and the session survives a reload", async ({ page }) => {
    await staffSignIn(page);
    await expect(page.getByText("Exchange and return requests")).toBeVisible();

    await page.reload(); // refresh cookie restores the session
    await expect(page.getByText("Exchange and return requests")).toBeVisible();

    await page.getByRole("tab", { name: "tools" }).click();
    await page.locator("#c-id").fill("high-rise-squat-proof-legging");
    await page.getByRole("button", { name: "Load" }).click();
    await expect(page.locator("#c-json")).toContainText('"label": "XL"');
    await page.getByRole("button", { name: "Save chart" }).click();
    await expect(page.getByText("Size chart saved.")).toBeVisible();

    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  });
});
