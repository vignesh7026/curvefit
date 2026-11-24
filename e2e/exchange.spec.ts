import { expect, test } from "@playwright/test";
import { API_URL } from "./helpers";

// The API enforces 5 OTP-style requests per 15 minutes per IP, so this file uses four:
// one order lookup, then for the exchange a code request, an item lookup and the exchange itself.

test("track an order by number and phone", async ({ page }) => {
  await page.goto("/track");
  await page.getByLabel("Order number").fill("1001");
  await page.getByLabel("Phone number").fill("9876543210");
  await page.getByRole("button", { name: "Track order" }).click();
  await expect(page.getByText(/Order #1001/)).toBeVisible();
  await expect(page.getByText(/1 × High-rise ankle legging/)).toBeVisible();
});

test("a customer exchanges a size with a phone code", async ({ page, request }) => {
  await page.goto("/exchange");
  await page.getByLabel("Order number").fill("1001");
  await page.getByLabel("Phone number").fill("9876543210");
  await page.getByRole("button", { name: "Send me a code" }).click();

  const code = page.getByLabel("6-digit code");
  await expect(code).toBeVisible();
  const { otp } = (await (await request.get(`${API_URL}/__test/last-otp`)).json()) as {
    otp: string;
  };
  expect(otp).toMatch(/^[0-9]{6}$/);

  await code.fill(otp);
  // The item list comes from the order itself, and its size is filled in for the customer.
  await expect(page.getByLabel("Item", { exact: true })).toHaveValue("High-rise ankle legging");
  await expect(page.getByLabel("Current size")).toHaveValue("2XL");
  await page.getByLabel("New size").fill("3XL");
  await page.getByRole("button", { name: "Request exchange" }).click();

  await expect(page.getByRole("heading", { name: "Exchange requested" })).toBeVisible();
  await expect(page.getByText(/Pickup is booked \(reference DEV-PICKUP-/)).toBeVisible();
  await expect(page.getByText(/replacement is order #DEV-3XL/)).toBeVisible();
});
