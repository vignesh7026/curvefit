import request from "supertest";
import { describe, expect, it } from "vitest";
import { sampleCharts } from "@curvefit/shared";
import { createApp } from "./app";
import { loadEnv } from "./config/env";
import { signAccessToken } from "./middleware/auth";
import type { Services } from "./services";

const env = loadEnv({
  NODE_ENV: "test",
  MONGODB_URI: "mongodb://localhost/test",
  JWT_ACCESS_SECRET: "a".repeat(32),
  JWT_REFRESH_SECRET: "b".repeat(32),
});

const unused = () => {
  throw new Error("not used in these tests");
};

// Only the services these tests touch are real fakes; the rest throw if reached.
const services = {
  reviews: {
    uploadPhoto: async () => ({ url: `http://localhost:4000/uploads/${"a".repeat(32)}.png` }),
  },
  fit: {
    create: async () => ({ id: "1" }),
    suggest: async () => ({
      sessionCount: 0,
      suggestion: { suggestions: [], insufficient: [], warnings: [], opacityFailures: 0 },
      draftChart: sampleCharts[0],
    }),
    list: unused,
    remove: async () => {},
  },
} as unknown as Services;

const app = createApp(env, services);
const staffToken = (role: "admin" | "support") =>
  signAccessToken({ id: "u", role }, env.JWT_ACCESS_SECRET);

describe("photo uploads", () => {
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.alloc(32),
  ]);

  it("accepts an image upload and returns its URL", async () => {
    const res = await request(app)
      .post("/api/reviews/photos")
      .set("Content-Type", "image/png")
      .send(png);
    expect(res.status).toBe(201);
    expect(res.body.data.url).toMatch(/\/uploads\/[a-f0-9]{32}\.png$/);
  });

  it("refuses a non-image content type with 415", async () => {
    const res = await request(app)
      .post("/api/reviews/photos")
      .set("Content-Type", "application/pdf")
      .send(Buffer.from("%PDF-1.4"));
    expect(res.status).toBe(415);
  });

  it("refuses an upload over 3 MB with 413", async () => {
    const res = await request(app)
      .post("/api/reviews/photos")
      .set("Content-Type", "image/png")
      .send(Buffer.alloc(3 * 1024 * 1024 + 10));
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe("TOO_LARGE");
  });
});

describe("health and client error reports", () => {
  it("reports degraded (503) when the database is not connected", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(503);
    expect(res.body.data).toMatchObject({ status: "degraded", db: false });
  });

  it("accepts a small error report and rejects an oversized one", async () => {
    const ok = await request(app)
      .post("/api/client-errors")
      .send({ message: "boom", path: "/shop", digest: "abc" });
    expect(ok.status).toBe(204);
    const bad = await request(app)
      .post("/api/client-errors")
      .send({ message: "x".repeat(400), path: "/shop" });
    expect(bad.status).toBe(400);
  });
});

describe("fit session access control", () => {
  const entry = {
    productId: "p",
    sizeTried: "XL",
    heightCm: 165,
    bustCm: 104,
    waistCm: 92,
    hipCm: 112,
    fit: "good",
  };
  const support = { Authorization: `Bearer ${staffToken("support")}` };

  it("lets support record a fit session and read the suggestion", async () => {
    expect(
      (await request(app).post("/api/admin/fit-sessions").set(support).send(entry)).status,
    ).toBe(201);
    expect((await request(app).get("/api/admin/fit-sessions/p/suggest").set(support)).status).toBe(
      200,
    );
  });

  it("blocks support from deleting entries, and anonymous users from everything", async () => {
    const id = "aaaaaaaaaaaaaaaaaaaaaaaa";
    expect((await request(app).delete(`/api/admin/fit-sessions/${id}`).set(support)).status).toBe(
      403,
    );
    expect((await request(app).post("/api/admin/fit-sessions").send(entry)).status).toBe(401);
  });

  it("rejects an invalid verdict", async () => {
    const res = await request(app)
      .post("/api/admin/fit-sessions")
      .set(support)
      .send({ ...entry, fit: "meh" });
    expect(res.status).toBe(400);
  });
});
