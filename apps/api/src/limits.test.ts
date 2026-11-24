import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "./app";
import { loadEnv } from "./config/env";
import type { Services } from "./services";

const env = loadEnv({
  NODE_ENV: "test",
  MONGODB_URI: "mongodb://localhost/test",
  JWT_ACCESS_SECRET: "a".repeat(32),
  JWT_REFRESH_SECRET: "b".repeat(32),
});

// The real limiters, with fake services: this checks that abuse-prone routes really are limited.
const services = {
  identity: {
    forgotPassword: async () => {},
    customerLogin: async () => {
      throw Object.assign(new Error("no"), { status: 401 });
    },
  },
  auth: {
    login: async () => {
      throw Object.assign(new Error("no"), { status: 401 });
    },
  },
} as unknown as Services;

const app = createApp(env, services);

describe("rate limits on account routes", () => {
  it("password recovery allows 6 requests per 15 minutes, then answers 429", async () => {
    const body = { type: "customer", email: "a@example.com" };
    for (let i = 0; i < 6; i++) {
      expect((await request(app).post("/api/auth/forgot").send(body)).status).toBe(202);
    }
    const blocked = await request(app).post("/api/auth/forgot").send(body);
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe("RATE_LIMITED");
  });

  it("sign-in allows 10 attempts, then answers 429 for both customers and staff", async () => {
    const body = { email: "a@example.com", password: "whatever-pass-1" };
    for (let i = 0; i < 10; i++) {
      const path = i % 2 ? "/api/account/login" : "/api/admin/login";
      expect((await request(app).post(path).send(body)).status).not.toBe(429);
    }
    expect((await request(app).post("/api/account/login").send(body)).status).toBe(429);
    expect((await request(app).post("/api/admin/login").send(body)).status).toBe(429);
  });
});
