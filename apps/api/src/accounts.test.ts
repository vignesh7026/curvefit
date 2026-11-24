import bcrypt from "bcryptjs";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "./app";
import { loadEnv } from "./config/env";
import { signRefreshToken } from "./middleware/auth";
import { AdminUserModel } from "./models/AdminUser";
import { AuthTokenModel } from "./models/AuthToken";
import { CustomerUserModel } from "./models/CustomerUser";
import { createServices } from "./services";
import type { Notifier, Template } from "./services/notifier";
import type { ShopifyOrder, ShopifyService } from "./services/shopifyService";

// These flows make many sign-in and recovery calls; the limiters have their own test file.
vi.mock("./middleware/rateLimit", () => {
  const pass = (_req: unknown, _res: unknown, next: () => void) => next();
  return {
    sizeLimiter: pass,
    otpLimiter: pass,
    loginLimiter: pass,
    generalLimiter: pass,
    refreshLimiter: pass,
    uploadLimiter: pass,
    clientErrorLimiter: pass,
    signupLimiter: pass,
    recoveryLimiter: pass,
  };
});

const env = loadEnv({
  NODE_ENV: "test",
  MONGODB_URI: "mongodb://localhost/test",
  JWT_ACCESS_SECRET: "a".repeat(32),
  JWT_REFRESH_SECRET: "b".repeat(32),
  WEB_URL: "http://web.test",
});

const sent: Array<{
  template: Template;
  to: { email?: string | null };
  vars: Record<string, string>;
}> = [];
const notifier: Notifier = {
  async send(to, template, vars = {}) {
    sent.push({ template, to, vars });
    return true;
  },
};
const order: ShopifyOrder = {
  id: "o1",
  orderNumber: "1001",
  phone: "",
  email: "asha@example.com",
  status: "FULFILLED",
  trackingUrl: "https://track.example/1",
  address: null,
  items: [{ title: "Legging", size: "2XL", quantity: 1 }],
};
const shopify: ShopifyService = {
  findOrder: async () => order,
  findOrdersByEmail: vi.fn(async () => [order]),
  hasStock: async () => true,
  createReplacementOrder: async () => "#1",
};

let mongod: MongoMemoryServer;
const app = createApp(env, createServices(env, { notifier, shopify }));

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { launchTimeout: 120_000 } });
  await mongoose.connect(mongod.getUri());
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
});
afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});
beforeEach(async () => {
  sent.length = 0;
  await Promise.all(Object.values(mongoose.models).map((m) => m.deleteMany({})));
});

const GOOD = "a-long-passphrase-1";
const signupBody = { name: "Asha", email: "asha@example.com", password: GOOD };
const lastLink = (template: Template) =>
  sent.filter((s) => s.template === template).at(-1)?.vars.link ?? "";
const tokenFrom = (link: string) => new URL(link).searchParams.get("token") ?? "";
const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

async function customer() {
  const agent = request.agent(app);
  const res = await agent.post("/api/account/signup").send(signupBody);
  return { agent, token: res.body.data.accessToken as string, res };
}

async function seedAdmin(role: "admin" | "support" = "admin", email = "boss@example.com") {
  await AdminUserModel.create({
    name: "Boss",
    email,
    role,
    passwordHash: await bcrypt.hash("admin-passphrase-1", 4),
  });
  const agent = request.agent(app);
  const res = await agent.post("/api/admin/login").send({ email, password: "admin-passphrase-1" });
  return { agent, token: res.body.data.accessToken as string };
}

describe("customer sign up", () => {
  it("creates an account, signs the person in and sends a verification link", async () => {
    const { res } = await customer();
    expect(res.status).toBe(201);
    expect(res.body.data.profile).toMatchObject({
      name: "Asha",
      email: "asha@example.com",
      emailVerified: false,
    });
    expect(String(res.headers["set-cookie"])).toMatch(/cf_cust=.*HttpOnly/i);
    expect(lastLink("verify_email")).toMatch(
      /^http:\/\/web\.test\/verify-email\?token=[a-f0-9]{64}$/,
    );
    // The password is stored as a hash, never as typed.
    const stored = await CustomerUserModel.findOne({ email: "asha@example.com" });
    expect(stored?.passwordHash).not.toContain(GOOD);
  });

  it("refuses a duplicate email, a short password and obviously weak ones", async () => {
    await customer();
    expect((await request(app).post("/api/account/signup").send(signupBody)).status).toBe(409);
    const short = await request(app)
      .post("/api/account/signup")
      .send({ ...signupBody, email: "b@example.com", password: "short" });
    expect(short.status).toBe(400);
    const weak = await request(app)
      .post("/api/account/signup")
      .send({ ...signupBody, email: "c@example.com", password: "password123" });
    expect(weak.body.error.code).toBe("WEAK_PASSWORD");
    const sameAsEmail = await request(app)
      .post("/api/account/signup")
      .send({ ...signupBody, email: "ashaperson@example.com", password: "ashaperson-123" });
    expect(sameAsEmail.body.error.code).toBe("WEAK_PASSWORD");
  });

  it("treats the email case-insensitively", async () => {
    await customer();
    const res = await request(app)
      .post("/api/account/login")
      .send({ email: "ASHA@Example.com", password: GOOD });
    expect(res.status).toBe(200);
  });
});

describe("customer sign in", () => {
  it("gives the same error for a wrong password and an unknown email", async () => {
    await customer();
    const wrong = await request(app)
      .post("/api/account/login")
      .send({ email: "asha@example.com", password: "wrong-password-1" });
    const unknown = await request(app)
      .post("/api/account/login")
      .send({ email: "nobody@example.com", password: "wrong-password-1" });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.error.message).toBe(unknown.body.error.message);
  });

  it("returns the profile for a valid token and nothing without one", async () => {
    const { token } = await customer();
    const me = await request(app).get("/api/account/me").set(bearer(token));
    expect(me.body.data.email).toBe("asha@example.com");
    expect((await request(app).get("/api/account/me")).status).toBe(401);
  });

  it("restores a session from the refresh cookie and ends it on logout", async () => {
    const { agent } = await customer();
    const refreshed = await agent.post("/api/account/refresh");
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.data.accessToken).toBeTruthy();
    await agent.post("/api/account/logout");
    expect((await agent.post("/api/account/refresh")).status).toBe(401);
  });

  it("lets the customer update their name and phone", async () => {
    const { token } = await customer();
    const res = await request(app)
      .patch("/api/account/me")
      .set(bearer(token))
      .send({ name: "Asha K", phone: "9876543210" });
    expect(res.body.data).toMatchObject({ name: "Asha K", phone: "9876543210" });
    const bad = await request(app)
      .patch("/api/account/me")
      .set(bearer(token))
      .send({ admin: true });
    expect(bad.status).toBe(400);
  });
});

describe("email verification and orders", () => {
  it("hides orders until the email is verified, and a link works only once", async () => {
    const { token } = await customer();
    const before = await request(app).get("/api/account/orders").set(bearer(token));
    expect(before.status).toBe(403);
    expect(shopify.findOrdersByEmail).not.toHaveBeenCalled();

    const link = tokenFrom(lastLink("verify_email"));
    expect(
      (await request(app).post("/api/account/verify-email").send({ token: link })).status,
    ).toBe(204);
    const after = await request(app).get("/api/account/orders").set(bearer(token));
    expect(after.status).toBe(200);
    expect(after.body.data[0]).toMatchObject({ orderNumber: "1001", status: "FULFILLED" });

    const again = await request(app).post("/api/account/verify-email").send({ token: link });
    expect(again.status).toBe(400);
    expect(again.body.error.code).toBe("INVALID_TOKEN");
  });

  it("rejects an expired link and an invented one", async () => {
    await customer();
    await AuthTokenModel.updateMany({}, { expiresAt: new Date(Date.now() - 1000) });
    const expired = tokenFrom(lastLink("verify_email"));
    expect(
      (await request(app).post("/api/account/verify-email").send({ token: expired })).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .post("/api/account/verify-email")
          .send({ token: "f".repeat(64) })
      ).status,
    ).toBe(400);
  });

  it("can resend the verification link", async () => {
    const { token } = await customer();
    sent.length = 0;
    const res = await request(app).post("/api/account/resend-verification").set(bearer(token));
    expect(res.status).toBe(202);
    expect(sent.map((s) => s.template)).toEqual(["verify_email"]);
  });
});

describe("password change and reset", () => {
  it("changing the password signs out other devices but keeps this one", async () => {
    const a = await customer(); // device A
    const b = request.agent(app); // device B
    await b.post("/api/account/login").send({ email: "asha@example.com", password: GOOD });
    expect((await b.post("/api/account/refresh")).status).toBe(200);

    const wrong = await request(app)
      .post("/api/account/password")
      .set(bearer(a.token))
      .send({ currentPassword: "not-my-password", newPassword: "another-long-pass-2" });
    expect(wrong.body.error.code).toBe("WRONG_PASSWORD");

    const ok = await a.agent
      .post("/api/account/password")
      .set(bearer(a.token))
      .send({ currentPassword: GOOD, newPassword: "another-long-pass-2" });
    expect(ok.status).toBe(200);
    expect((await a.agent.post("/api/account/refresh")).status).toBe(200); // this device
    expect((await b.post("/api/account/refresh")).status).toBe(401); // the other device
    expect(
      (
        await request(app)
          .post("/api/account/login")
          .send({ email: "asha@example.com", password: GOOD })
      ).status,
    ).toBe(401);
  });

  it("resets a forgotten password with a one-time link, and tells nobody who has an account", async () => {
    await customer();
    sent.length = 0;
    const unknown = await request(app)
      .post("/api/auth/forgot")
      .send({ type: "customer", email: "nobody@example.com" });
    expect(unknown.status).toBe(202);
    expect(sent).toHaveLength(0);

    const known = await request(app)
      .post("/api/auth/forgot")
      .send({ type: "customer", email: "asha@example.com" });
    expect(known.status).toBe(202);
    expect(known.body).toEqual(unknown.body); // same answer either way
    const link = lastLink("password_reset");
    expect(link).toMatch(/^http:\/\/web\.test\/account\/reset\?token=/);
    const token = tokenFrom(link);

    const reset = await request(app)
      .post("/api/auth/reset")
      .send({ type: "customer", token, password: "brand-new-passphrase-3" });
    expect(reset.status).toBe(204);
    expect(
      (
        await request(app)
          .post("/api/account/login")
          .send({ email: "asha@example.com", password: "brand-new-passphrase-3" })
      ).status,
    ).toBe(200);
    expect(
      (
        await request(app)
          .post("/api/account/login")
          .send({ email: "asha@example.com", password: GOOD })
      ).status,
    ).toBe(401);
    // A reset proves control of the inbox, so it also verifies the email.
    expect((await CustomerUserModel.findOne({}))?.emailVerified).toBe(true);
    // And the link cannot be used twice.
    const reuse = await request(app)
      .post("/api/auth/reset")
      .send({ type: "customer", token, password: "yet-another-passphrase-4" });
    expect(reuse.status).toBe(400);
  });

  it("a customer reset link does not work on a staff account, and vice versa", async () => {
    await customer();
    await seedAdmin();
    await request(app)
      .post("/api/auth/forgot")
      .send({ type: "customer", email: "asha@example.com" });
    const token = tokenFrom(lastLink("password_reset"));
    const wrongType = await request(app)
      .post("/api/auth/reset")
      .send({ type: "staff", token, password: "brand-new-passphrase-3" });
    expect(wrongType.status).toBe(400);
  });

  it("a staff reset signs out the staff member's sessions", async () => {
    const { agent } = await seedAdmin();
    expect((await agent.post("/api/admin/refresh")).status).toBe(200);
    await request(app).post("/api/auth/forgot").send({ type: "staff", email: "boss@example.com" });
    const link = lastLink("password_reset");
    expect(link).toMatch(/\/admin\/reset\?token=/);
    await request(app)
      .post("/api/auth/reset")
      .send({ type: "staff", token: tokenFrom(link), password: "new-admin-passphrase-5" });
    expect((await agent.post("/api/admin/refresh")).status).toBe(401);
  });
});

describe("deleting an account", () => {
  it("needs the password, then removes the account and its tokens", async () => {
    const { token, agent } = await customer();
    const wrong = await request(app)
      .delete("/api/account/me")
      .set(bearer(token))
      .send({ password: "not-my-password" });
    expect(wrong.status).toBe(400);
    expect(await CustomerUserModel.countDocuments()).toBe(1);

    const ok = await agent.delete("/api/account/me").set(bearer(token)).send({ password: GOOD });
    expect(ok.status).toBe(204);
    expect(await CustomerUserModel.countDocuments()).toBe(0);
    expect(await AuthTokenModel.countDocuments()).toBe(0);
    expect(
      (
        await request(app)
          .post("/api/account/login")
          .send({ email: "asha@example.com", password: GOOD })
      ).status,
    ).toBe(401);
  });
});

describe("customers and staff are kept apart", () => {
  it("a customer token cannot reach staff routes, and a staff token cannot reach customer routes", async () => {
    const c = await customer();
    const s = await seedAdmin();
    expect((await request(app).get("/api/admin/stats").set(bearer(c.token))).status).toBe(401);
    expect((await request(app).get("/api/account/me").set(bearer(s.token))).status).toBe(401);
  });

  it("a staff refresh token is refused by the customer refresh route", async () => {
    await customer();
    const staff = await AdminUserModel.create({
      name: "S",
      email: "s@example.com",
      role: "admin",
      passwordHash: "x",
    });
    const forged = signRefreshToken(
      { id: String(staff._id), tokenVersion: 0 },
      "staff",
      env.JWT_REFRESH_SECRET,
    );
    const res = await request(app).post("/api/account/refresh").set("Cookie", `cf_cust=${forged}`);
    expect(res.status).toBe(401);
  });
});

describe("staff accounts are by invitation only", () => {
  it("an admin invites someone, who sets a password and signs in", async () => {
    const admin = await seedAdmin();
    const invite = await request(app)
      .post("/api/admin/invites")
      .set(bearer(admin.token))
      .send({ email: "Maya@example.com", role: "support" });
    expect(invite.status).toBe(201);
    const link = lastLink("staff_invite");
    expect(link).toMatch(/^http:\/\/web\.test\/admin\/signup\?token=[a-f0-9]{64}$/);
    const token = tokenFrom(link);

    const info = await request(app).post("/api/admin/invite-info").send({ token });
    expect(info.body.data).toEqual({ email: "maya@example.com", role: "support" });

    const accepted = await request(app)
      .post("/api/admin/accept-invite")
      .send({ token, name: "Maya", password: "long-passphrase-number-six" });
    expect(accepted.status).toBe(201);
    expect(accepted.body.data.role).toBe("support");

    const login = await request(app)
      .post("/api/admin/login")
      .send({ email: "maya@example.com", password: "long-passphrase-number-six" });
    expect(login.body.data).toMatchObject({ role: "support", name: "Maya" });

    // The link is single-use.
    const again = await request(app)
      .post("/api/admin/accept-invite")
      .send({ token, name: "Mallory", password: "mallory-long-passphrase-7" });
    expect(again.status).toBe(400);
  });

  it("nobody can sign up as staff without a valid invitation", async () => {
    const res = await request(app)
      .post("/api/admin/accept-invite")
      .send({ token: "a".repeat(64), name: "Mallory", password: "mallory-long-passphrase-7" });
    expect(res.status).toBe(400);
    expect(await AdminUserModel.countDocuments()).toBe(0);
  });

  it("only admins can invite, list, revoke and see the team", async () => {
    const support = await seedAdmin("support", "help@example.com");
    const h = bearer(support.token);
    expect(
      (
        await request(app)
          .post("/api/admin/invites")
          .set(h)
          .send({ email: "x@example.com", role: "admin" })
      ).status,
    ).toBe(403);
    expect((await request(app).get("/api/admin/invites").set(h)).status).toBe(403);
    expect((await request(app).get("/api/admin/team").set(h)).status).toBe(403);
    expect(
      (
        await request(app)
          .post("/api/admin/invites")
          .send({ email: "x@example.com", role: "admin" })
      ).status,
    ).toBe(401);
  });

  it("an admin can revoke an invitation, and cannot invite an existing member", async () => {
    const admin = await seedAdmin();
    const h = bearer(admin.token);
    await request(app)
      .post("/api/admin/invites")
      .set(h)
      .send({ email: "new@example.com", role: "support" });
    const token = tokenFrom(lastLink("staff_invite"));
    const list = await request(app).get("/api/admin/invites").set(h);
    expect(list.body.data).toHaveLength(1);
    expect(
      (await request(app).delete(`/api/admin/invites/${list.body.data[0].id}`).set(h)).status,
    ).toBe(204);
    expect((await request(app).post("/api/admin/invite-info").send({ token })).status).toBe(400);

    const dup = await request(app)
      .post("/api/admin/invites")
      .set(h)
      .send({ email: "boss@example.com", role: "admin" });
    expect(dup.status).toBe(409);
    expect((await request(app).get("/api/admin/team").set(h)).body.data).toHaveLength(1);
  });

  it("a new invitation replaces an older one for the same email", async () => {
    const admin = await seedAdmin();
    const h = bearer(admin.token);
    await request(app)
      .post("/api/admin/invites")
      .set(h)
      .send({ email: "new@example.com", role: "support" });
    const first = tokenFrom(lastLink("staff_invite"));
    await request(app)
      .post("/api/admin/invites")
      .set(h)
      .send({ email: "new@example.com", role: "admin" });
    expect((await request(app).post("/api/admin/invite-info").send({ token: first })).status).toBe(
      400,
    );
  });
});
