import { expect, test } from "@playwright/test";
import { openLegging, runSizeFinder } from "./helpers";

test.describe("browse to cart", () => {
  test("find my size, add it to the cart and see it there", async ({ page }) => {
    await openLegging(page);

    // The full size chart is on the page.
    await expect(page.getByRole("heading", { name: "Size chart" })).toBeVisible();
    await expect(page.getByRole("row", { name: /^2XL/ })).toBeVisible();

    await runSizeFinder(page, { height: "165", bust: "112", waist: "100", hip: "120" });
    await expect(page.getByText("We recommend 2XL")).toBeVisible();
    await expect(page.getByRole("radio", { name: /^2XL/ })).toBeChecked();

    await page.getByRole("button", { name: "Add 2XL to cart" }).click();
    await expect(page.getByText("Added to your cart.")).toBeVisible();
    await expect(page.getByRole("link", { name: /Cart, 1 item/ })).toBeVisible();

    await page.getByRole("link", { name: "View cart" }).click();
    await expect(page.getByRole("heading", { name: "Your cart" })).toBeVisible();
    await expect(page.getByText("Size 2XL")).toBeVisible();
    // The cart survives a reload.
    await page.reload();
    await expect(page.getByText("Size 2XL")).toBeVisible();

    // No store is connected, so checkout is the labelled demo: it takes no payment.
    await expect(page.getByText(/Demo mode: checkout is a stand-in/)).toBeVisible();
    await page.getByRole("button", { name: "Checkout" }).click();
    await expect(page.getByText("Demo checkout: no payment is taken.")).toBeVisible();
    await page.getByRole("button", { name: "Place demo order" }).click();
    await expect(page.getByRole("heading", { name: "Demo order placed" })).toBeVisible();
    await expect(page.getByText(/No payment was taken/)).toBeVisible();
    await page.goto("/cart");
    await expect(page.getByText("Your cart is empty.")).toBeVisible();
  });

  test("changing quantity and removing works", async ({ page }) => {
    await openLegging(page);
    await page.getByRole("radio", { name: /^3XL/ }).check({ force: true });
    await page.getByRole("button", { name: "Add 3XL to cart" }).click();
    await page.goto("/cart");
    await page.getByRole("button", { name: /Increase quantity/ }).click();
    await expect(page.getByRole("link", { name: /Cart, 2 items/ })).toBeVisible();
    await page.getByRole("button", { name: /Remove/ }).click();
    await expect(page.getByText("Your cart is empty.")).toBeVisible();
  });

  test("a build-a-set adds a bra and a legging", async ({ page }) => {
    await page.goto("/shop");
    await page.locator("#bundle-bra").selectOption("2XL");
    await page.locator("#bundle-leg").selectOption("3XL");
    await page.getByRole("button", { name: "Add both to cart" }).click();
    await expect(page.getByRole("link", { name: /Cart, 2 items/ })).toBeVisible();
  });
});

test.describe("size finder edge cases", () => {
  test("shows both sizes when a measurement sits on a band edge", async ({ page }) => {
    await openLegging(page);
    await runSizeFinder(page, { height: "165", bust: "104", waist: "92", hip: "115" });
    await expect(page.getByText("We recommend XL")).toBeVisible();
    await expect(page.getByText("You could also consider 2XL.")).toBeVisible();
  });

  test("explains when a measurement is outside the range", async ({ page }) => {
    await openLegging(page);
    await runSizeFinder(page, { height: "165", bust: "112", waist: "100", hip: "165" });
    await expect(page.getByText(/above our current size range/)).toBeVisible();
  });
});

test.describe("measurements and privacy", () => {
  test("nothing is saved unless the customer agrees, and they can delete what was", async ({
    page,
  }) => {
    await openLegging(page);
    await runSizeFinder(page, { height: "165", bust: "112", waist: "100", hip: "120" });
    await expect(page.getByText("We recommend 2XL")).toBeVisible();
    await page.goto("/privacy");
    await expect(page.getByText("This browser has no saved size-finder records.")).toBeVisible();

    await openLegging(page);
    await page.getByLabel(/Save my measurements/).check();
    await runSizeFinder(page, { height: "165", bust: "112", waist: "100", hip: "120" });
    await expect(page.getByText("We recommend 2XL")).toBeVisible();

    await page.goto("/privacy");
    await expect(page.getByText("This browser has 1 saved size-finder record.")).toBeVisible();
    await page.getByRole("button", { name: "Delete my saved measurements" }).click();
    await expect(page.getByText("Deleted.")).toBeVisible();
    await expect(page.getByText("This browser has no saved size-finder records.")).toBeVisible();
  });
});

test.describe("waitlist", () => {
  test("joining gives a referral link", async ({ page }) => {
    await page.goto("/waitlist");
    await page.getByLabel("Email", { exact: true }).fill(`e2e-${Date.now()}@example.com`);
    await page.getByLabel("3XL").check();
    await page.getByLabel(/Email me about the launch/).check();
    await page.getByRole("button", { name: "Join the list" }).click();
    await expect(page.getByText("You are on the list.")).toBeVisible();
    await expect(page.getByText(/\/waitlist\?ref=[A-Z2-9]{8}/)).toBeVisible();
  });
});
