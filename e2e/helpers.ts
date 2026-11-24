import { type APIRequestContext, type Page, expect } from "@playwright/test";

export const API_URL = "http://localhost:4100";

/** Opens the legging product page from the home page, the way a shopper would. */
export async function openLegging(page: Page) {
  await page.goto("/");
  await page.getByRole("link", { name: "Shop the first five" }).click();
  await page.getByRole("link", { name: /High-rise ankle legging/ }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "High-rise ankle legging" }),
  ).toBeVisible();
}

export async function runSizeFinder(
  page: Page,
  m: { height: string; bust: string; waist: string; hip: string },
) {
  await page.locator("#height").fill(m.height);
  await page.locator("#bust").fill(m.bust);
  await page.locator("#waist").fill(m.waist);
  await page.locator("#hip").fill(m.hip);
  await page.getByRole("button", { name: "Recommend my size" }).click();
}

export const ADMIN = { email: "admin@e2e.test", password: "e2e-password-1" };

/** Signs a staff member in through the real sign-in page and waits for the dashboard. */
export async function staffSignIn(page: Page, email = ADMIN.email, password = ADMIN.password) {
  await page.goto("/admin/login");
  await page.getByLabel("Work email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

/** The variables of the last message the API sent of this kind (links, codes), for tests. */
export async function lastMessage(
  request: APIRequestContext,
  template: string,
): Promise<Record<string, string>> {
  const res = await request.get(`${API_URL}/__test/last-message/${template}`);
  return (await res.json()) as Record<string, string>;
}
