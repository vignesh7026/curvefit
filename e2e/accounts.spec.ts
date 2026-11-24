import { expect, test, type Page } from "@playwright/test";
import { lastMessage, staffSignIn } from "./helpers";

const PASSWORD = "a-long-passphrase-1";
const unique = () => `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;

async function signUp(page: Page, email: string, password = PASSWORD) {
  await page.goto("/signup");
  await page.getByLabel("Your name").fill("Asha Kumar");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel(/I have read the/).check();
  await page.getByRole("button", { name: "Create account" }).click();
}

async function logIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
}

test.describe("customer accounts", () => {
  test("sign up, confirm the email, and see your orders", async ({ page, request }) => {
    const email = unique();
    await signUp(page, email);

    // Signed in straight away, but orders wait for the email to be confirmed.
    await expect(page).toHaveURL(/\/account\?welcome=1/);
    await expect(page.getByRole("heading", { name: "Hi, Asha" })).toBeVisible();
    await expect(page.getByText("Welcome. One more step.")).toBeVisible();
    await expect(page.getByText(/show here once your email is confirmed/)).toBeVisible();

    // The header now shows the name instead of "Log in".
    await expect(page.getByRole("link", { name: /Your account: Asha/ })).toBeVisible();

    // Follow the emailed link.
    const { link } = await lastMessage(request, "verify_email");
    expect(link).toMatch(/\/verify-email\?token=[a-f0-9]{64}$/);
    await page.goto(link as string);
    await expect(page.getByRole("heading", { name: "Email confirmed" })).toBeVisible();

    await page.goto("/account");
    await expect(page.getByText("Order #1001")).toBeVisible();
    await expect(page.getByRole("link", { name: "Exchange or return" }).first()).toBeVisible();

    // The link works once.
    await page.goto(link as string);
    await expect(page.getByRole("heading", { name: "This link has expired" })).toBeVisible();
  });

  test("log out and back in, and a wrong password is refused kindly", async ({ page }) => {
    const email = unique();
    await signUp(page, email);
    await expect(page.getByRole("heading", { name: "Hi, Asha" })).toBeVisible();

    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("link", { name: "Log in" })).toBeVisible();
    // The account page is not available when signed out.
    await page.goto("/account");
    await expect(page).toHaveURL(/\/login\?next=\/account/);

    await logIn(page, email, "not-my-password-1");
    await expect(page.getByText(/email and password do not match/)).toBeVisible();

    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL(/\/account$/);
    await expect(page.getByRole("heading", { name: "Hi, Asha" })).toBeVisible();
  });

  test("the session survives a reload and show/hide works on passwords", async ({ page }) => {
    await signUp(page, unique());
    await expect(page.getByRole("heading", { name: "Hi, Asha" })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: "Hi, Asha" })).toBeVisible();

    await page.goto("/login");
    // Signed in people are sent on to their account.
    await expect(page).toHaveURL(/\/account$/);
  });

  test("sign up explains problems in plain words", async ({ page }) => {
    const email = unique();
    await signUp(page, email);
    await expect(page).toHaveURL(/\/account/);
    await page.getByRole("button", { name: "Log out" }).click();

    // Same email again.
    await signUp(page, email);
    await expect(page.getByText(/already an account with that email/)).toBeVisible();

    // A password everyone guesses first.
    await signUp(page, unique(), "password123");
    await expect(page.getByText(/too easy to guess/)).toBeVisible();

    // The helper text counts down as you type.
    await page.getByLabel("Password", { exact: true }).fill("short");
    await expect(page.getByText("5 more characters to go.")).toBeVisible();
    await page.getByRole("button", { name: /Show password/ }).click();
    await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute("type", "text");
  });

  test("forgot your password: reset with the emailed link, old password stops working", async ({
    page,
    request,
  }) => {
    const email = unique();
    await signUp(page, email);
    await page.getByRole("button", { name: "Log out" }).click();

    await page.goto("/account/forgot");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByRole("button", { name: "Send me a reset link" }).click();
    await expect(page.getByText("Check your inbox")).toBeVisible();

    const { link } = await lastMessage(request, "password_reset");
    expect(link).toMatch(/\/account\/reset\?token=/);
    await page.goto(link as string);
    await page.getByLabel("New password").fill("a-brand-new-passphrase-2");
    await page.getByRole("button", { name: "Save new password" }).click();
    await expect(page.getByText("Password updated")).toBeVisible();

    await logIn(page, email, PASSWORD);
    await expect(page.getByText(/email and password do not match/)).toBeVisible();
    await page.getByLabel("Password", { exact: true }).fill("a-brand-new-passphrase-2");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL(/\/account$/);
  });

  test("a made-up reset link is turned away", async ({ page }) => {
    await page.goto(`/account/reset?token=${"b".repeat(64)}`);
    await page.getByLabel("New password").fill("a-brand-new-passphrase-2");
    await page.getByRole("button", { name: "Save new password" }).click();
    await expect(page.getByText(/expired or was already used/)).toBeVisible();
    await page.goto("/account/reset?token=nonsense");
    await expect(page.getByText("This link does not look right")).toBeVisible();
  });

  test("update details, change password, and delete the account", async ({ page }) => {
    const email = unique();
    await signUp(page, email);

    await page.getByLabel("Name", { exact: true }).fill("Asha K");
    await page.getByLabel("Phone", { exact: true }).fill("9876543210");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Saved.")).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Phone", { exact: true })).toHaveValue("9876543210");

    await page.getByLabel("Current password").fill(PASSWORD);
    await page.getByLabel("New password").fill("another-long-passphrase-3");
    await page.getByRole("button", { name: "Change password" }).click();
    await expect(page.getByText(/Password changed/)).toBeVisible();

    page.once("dialog", (d) => void d.accept());
    await page.getByText("I want to delete my account").click();
    await page.getByLabel("Confirm with your password").fill("another-long-passphrase-3");
    await page.getByRole("button", { name: "Delete my account" }).click();
    await expect(page).toHaveURL(/\?deleted=1/);

    await logIn(page, email, "another-long-passphrase-3");
    await expect(page.getByText(/email and password do not match/)).toBeVisible();
  });
});

test.describe("team accounts are by invitation", () => {
  test("an admin invites a colleague, who joins as support", async ({ page, request, browser }) => {
    await staffSignIn(page);
    await page.getByRole("tab", { name: "team" }).click();

    const colleague = `colleague-${Date.now()}@example.com`;
    await page.getByLabel("Their email").fill(colleague);
    await page.getByLabel("Role").selectOption("support");
    await page.getByRole("button", { name: "Send invitation" }).click();
    await expect(page.getByText(`Invitation sent to ${colleague}`)).toBeVisible();
    await expect(page.getByRole("listitem").filter({ hasText: colleague })).toBeVisible();

    // The colleague opens the link in their own browser.
    const { link } = await lastMessage(request, "staff_invite");
    expect(link).toMatch(/\/admin\/signup\?token=/);
    const ctx = await browser.newContext();
    const other = await ctx.newPage();
    await other.goto(link as string);
    await expect(other.getByText(/invited as support/)).toBeVisible();
    await other.getByLabel("Your name").fill("Maya Support");
    await other.getByLabel("Choose a password").fill("a-support-passphrase-9");
    await other.getByRole("button", { name: "Create my account" }).click();
    await expect(other).toHaveURL(/\/admin$/);
    await expect(other.getByText(/Maya Support, signed in as support/)).toBeVisible();

    // Support does not see the admin-only tabs.
    await expect(other.getByRole("tab", { name: "team" })).toHaveCount(0);
    await expect(other.getByRole("tab", { name: "tools" })).toHaveCount(0);
    await expect(other.getByRole("tab", { name: "exchanges" })).toBeVisible();

    // The invitation cannot be reused.
    await other.goto(link as string);
    await expect(other.getByText("This invitation is not valid")).toBeVisible();
    await ctx.close();

    // The admin now sees them on the team.
    await page.getByRole("tab", { name: "tools" }).click();
    await page.getByRole("tab", { name: "team" }).click();
    await expect(page.getByText("Maya Support")).toBeVisible();
  });

  test("nobody can sign up as staff without an invitation", async ({ page }) => {
    await page.goto("/admin/signup");
    await expect(page.getByText("You need an invitation")).toBeVisible();
    await expect(page.getByLabel("Your name")).toHaveCount(0);

    await page.goto(`/admin/signup?token=${"c".repeat(64)}`);
    await expect(page.getByText("This invitation is not valid")).toBeVisible();
  });

  test("a customer session does not open the team dashboard", async ({ page }) => {
    await signUp(page, unique());
    await expect(page.getByRole("heading", { name: "Hi, Asha" })).toBeVisible();
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login$/);
  });
});
