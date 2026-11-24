import { expect, test } from "@playwright/test";
import { API_URL, ADMIN, openLegging, staffSignIn } from "./helpers";

// A real 1x1 PNG, so the server's content check accepts it and the browser can draw it.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

test.describe("team sign in", () => {
  test("staff sign in at /admin/login and land in the dashboard", async ({ page }) => {
    await staffSignIn(page);
    await expect(page.getByText("Exchange and return requests")).toBeVisible();
    await expect(page.getByText(/signed in as admin/)).toBeVisible();
  });

  test("a wrong password stays on the page with an error", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Work email").fill(ADMIN.email);
    await page.getByLabel("Password", { exact: true }).fill("not-the-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Invalid email or password.")).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test("the header leads to the customer login, which points staff to their own", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Log in" }).click();
    await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
    await page.locator("#main").getByRole("link", { name: "Team sign in" }).click();
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  });

  test("the dashboard sends signed-out visitors to the sign-in page", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login$/);
  });
});

test.describe("review photos", () => {
  test("a photo is uploaded, held for moderation, then shown on the product page", async ({
    page,
  }) => {
    const text = `photo review ${Date.now()}`;
    await openLegging(page);
    await page.getByRole("button", { name: "Write a review" }).click();
    await page.locator("#rv-size").selectOption("3XL");
    await page.locator("#rv-height").fill("168");
    await page.locator("#rv-hip").fill("128");
    await page.locator("#rv-body").fill(text);

    await page
      .locator("#rv-photos")
      .setInputFiles({ name: "me.png", mimeType: "image/png", buffer: PNG });
    await expect(page.getByAltText("Your photo 1")).toBeVisible();
    await page.getByRole("button", { name: "Submit review" }).click();
    await expect(page.getByText(/will appear once we have checked it/)).toBeVisible();

    // Staff see the photo next to the review and approve it.
    await staffSignIn(page);
    await page.getByRole("tab", { name: "reviews" }).click();
    const card = page.getByRole("listitem").filter({ hasText: text });
    await expect(card.getByAltText(/Review photo 1/)).toBeVisible();
    await card.getByRole("button", { name: "Approve" }).click();
    await expect(card).toHaveCount(0);

    // It shows publicly, and the image really loads across origins.
    await openLegging(page);
    // The review card is an article: find it by its text.
    const photo = page.locator("article", { hasText: text }).getByAltText("Reviewer photo 1");
    await expect(photo).toBeVisible();
    await expect
      .poll(() => photo.evaluate((el) => (el as HTMLImageElement).naturalWidth))
      .toBeGreaterThan(0);
  });

  test("a file that is not really an image is refused", async ({ page }) => {
    await openLegging(page);
    await page.getByRole("button", { name: "Write a review" }).click();
    await page.locator("#rv-photos").setInputFiles({
      name: "fake.png",
      mimeType: "image/png",
      buffer: Buffer.from("this is plain text pretending to be a picture"),
    });
    await expect(page.getByText(/could not be uploaded/)).toBeVisible();
    await expect(page.getByAltText("Your photo 1")).toHaveCount(0);
  });
});

test.describe("fit sessions", () => {
  test("record fittings, draft a chart from them and save it", async ({ page, request }) => {
    await staffSignIn(page);
    await page.getByRole("tab", { name: "fittings" }).click();
    await page.locator("#fit-product").fill("high-impact-sports-bra");

    for (const [bust, waist, hip] of [
      ["100", "89", "109"],
      ["101", "90", "110"],
      ["102", "91", "111"],
    ]) {
      await page.locator("#fit-size").fill("XL");
      await page.locator("#fit-height").fill("165");
      await page.locator("#fit-bust").fill(bust as string);
      await page.locator("#fit-waist").fill(waist as string);
      await page.locator("#fit-hip").fill(hip as string);
      await page.getByRole("button", { name: "Save entry" }).click();
      await expect(page.getByText("Entry saved.")).toBeVisible();
    }
    await expect(page.getByRole("heading", { name: "Entries (3)" })).toBeVisible();

    await page.getByRole("button", { name: "Draft from fittings" }).click();
    await expect(page.getByText(/Updated: XL \(3\)/)).toBeVisible();
    await expect(page.getByText(/Need more good fits: 2XL \(0\/3\)/)).toBeVisible();

    await page.getByRole("button", { name: "Save as the live chart" }).click();
    await expect(page.getByText(/Size chart saved/)).toBeVisible();

    const chart = await (await request.get(`${API_URL}/api/size/high-impact-sports-bra`)).json();
    expect(chart.data.bands[0].hip).toEqual({ min: 109, max: 111 });
    expect(chart.data.bands[0].bust).toEqual({ min: 100, max: 102 });
  });
});

test.describe("monitoring and tracking", () => {
  test("health reports the database, and client errors are accepted", async ({ request }) => {
    const health = await request.get(`${API_URL}/api/health`);
    expect(health.status()).toBe(200);
    expect((await health.json()).data).toMatchObject({ status: "ok", db: true });

    const report = await request.post(`${API_URL}/api/client-errors`, {
      data: { message: "e2e test error", path: "/e2e" },
    });
    expect(report.status()).toBe(204);
  });

  test("the funnel events fire, ending in a purchase", async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { __events: unknown[][]; gtag: (...a: unknown[]) => void };
      w.__events = [];
      w.gtag = (...args) => {
        w.__events.push(args);
      };
    });
    await openLegging(page);
    await page.getByRole("radio", { name: /^2XL/ }).check({ force: true });
    await page.getByRole("button", { name: "Add 2XL to cart" }).click();
    await page.goto("/cart");
    await page.getByRole("button", { name: "Checkout" }).click();
    await page.getByRole("button", { name: "Place demo order" }).click();
    await expect(page.getByRole("heading", { name: "Demo order placed" })).toBeVisible();

    const names = await page.evaluate(() =>
      (window as unknown as { __events: unknown[][] }).__events.map((e) => e[1]),
    );
    // The cart was reached with a page load, so only purchase and later events are in this page.
    expect(names).toContain("purchase");
    const purchase = await page.evaluate(() =>
      (window as unknown as { __events: unknown[][] }).__events.find((e) => e[1] === "purchase"),
    );
    expect(purchase?.[2]).toMatchObject({ currency: "INR", value: 1799 });
    expect(String((purchase?.[2] as { transaction_id: string }).transaction_id)).toMatch(/^DEMO-/);
  });
});

test.describe("policy pages", () => {
  for (const [path, heading] of [
    ["/returns", "Returns and exchanges"],
    ["/shipping", "Shipping"],
    ["/terms", "Terms of service"],
    ["/privacy", "Privacy"],
  ] as const) {
    test(`${path} is clearly marked as a draft with open decisions`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
      await expect(page.getByText("Draft: not final")).toBeVisible();
      await expect(page.getByText(/Still to be decided/)).toBeVisible();
    });
  }

  test("contact page renders without invented details", async ({ page }) => {
    await page.goto("/contact");
    await expect(page.getByRole("heading", { name: "Contact us" })).toBeVisible();
  });
});
