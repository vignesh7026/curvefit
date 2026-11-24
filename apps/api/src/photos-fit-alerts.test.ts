import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { sampleLegging } from "@curvefit/shared";
import { loadEnv } from "./config/env";
import { createFitService } from "./services/fitService";
import {
  MAX_PHOTO_BYTES,
  createLocalStorage,
  createPhotoStorage,
  detectImage,
} from "./services/photoStorage";
import { createReviewService } from "./services/reviewService";
import { createSizeService } from "./services/sizeService";
import { createAlerter } from "./utils/alerts";

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { launchTimeout: 120_000 } });
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]),
  Buffer.alloc(64),
]);
const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64)]);

describe("review photos", () => {
  const base = {
    productId: "legging",
    rating: 5,
    sizeWorn: "3XL",
    heightCm: 165,
    hipCm: 127,
    fit: "true_to_size" as const,
    body: "",
  };

  it("saves real images, and a review may only use photos we stored", async () => {
    const dir = await mkdtemp(join(tmpdir(), "cf-photos-"));
    try {
      const svc = createReviewService(createLocalStorage(dir, "http://api.test"));

      const a = await svc.uploadPhoto(png);
      const b = await svc.uploadPhoto(jpeg);
      expect(a.url).toMatch(/^http:\/\/api\.test\/uploads\/[a-f0-9]{32}\.png$/);
      expect(b.url).toMatch(/\.jpg$/);
      expect((await readdir(dir)).length).toBe(2);

      const ok = await svc.create({ ...base, photoUrls: [a.url] });
      expect(ok.status).toBe("pending");
      await expect(
        svc.create({ ...base, photoUrls: ["https://evil.example/pixel.png"] }),
      ).rejects.toMatchObject({ code: "INVALID_PHOTO" });
      await expect(
        svc.create({ ...base, photoUrls: ["http://api.test/uploads/../../etc/passwd"] }),
      ).rejects.toMatchObject({ code: "INVALID_PHOTO" });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("rejects files that only claim to be images, empty files and huge files", async () => {
    const svc = createReviewService(createLocalStorage(tmpdir(), "http://api.test"));
    await expect(
      svc.uploadPhoto(Buffer.from("<html><script>alert(1)</script></html>")),
    ).rejects.toMatchObject({ code: "INVALID_PHOTO" });
    await expect(svc.uploadPhoto(Buffer.alloc(0))).rejects.toMatchObject({ code: "INVALID_PHOTO" });
    await expect(svc.uploadPhoto(Buffer.alloc(MAX_PHOTO_BYTES + 1))).rejects.toMatchObject({
      code: "PHOTO_TOO_LARGE",
    });
  });

  it("detects image types by content, not by name", () => {
    expect(detectImage(png)).toBe("png");
    expect(detectImage(jpeg)).toBe("jpg");
    const webp = Buffer.concat([
      Buffer.from("RIFF"),
      Buffer.alloc(4),
      Buffer.from("WEBP"),
      Buffer.alloc(8),
    ]);
    expect(detectImage(webp)).toBe("webp");
    expect(detectImage(Buffer.from("GIF89a-not-allowed-here"))).toBeNull();
  });

  it("has no production fallback to local disk", async () => {
    const env = loadEnv({
      NODE_ENV: "production",
      MONGODB_URI: "x",
      JWT_ACCESS_SECRET: "a".repeat(32),
      JWT_REFRESH_SECRET: "b".repeat(32),
    });
    await expect(createPhotoStorage(env).save(png, "png")).rejects.toMatchObject({ status: 503 });
  });
});

describe("fit sessions", () => {
  it("records entries and drafts a chart from the good fits", async () => {
    const svc = createFitService(createSizeService());
    const base = { productId: sampleLegging.productId, heightCm: 165, fit: "good" as const };
    for (const hip of [108, 110, 112, 114]) {
      await svc.create({
        ...base,
        sizeTried: "XL",
        bustCm: hip - 8,
        waistCm: hip - 20,
        hipCm: hip,
      });
    }
    await svc.create({
      ...base,
      sizeTried: "XL",
      bustCm: 120,
      waistCm: 110,
      hipCm: 125,
      fit: "too_small",
      opacityOk: false,
    });
    const draft = await svc.suggest(sampleLegging.productId);
    expect(draft.sessionCount).toBe(5);
    expect(draft.suggestion.suggestions[0]).toMatchObject({ label: "XL", goodCount: 4 });
    expect(draft.suggestion.opacityFailures).toBe(1);
    expect(draft.draftChart.bands[0]?.hip).toEqual({ min: 108, max: 114 });
    expect(draft.draftChart.bands[1]).toEqual(sampleLegging.bands[1]); // other sizes untouched
    expect(draft.suggestion.insufficient.length).toBe(5);

    const rows = (await svc.list(sampleLegging.productId)) as Array<{ _id: unknown }>;
    expect(rows).toHaveLength(5);
    await svc.remove(String(rows[0]?._id));
    expect(await svc.list(sampleLegging.productId)).toHaveLength(4);
    await expect(svc.remove("aaaaaaaaaaaaaaaaaaaaaaaa")).rejects.toThrow();
  });
});

describe("alerts", () => {
  it("posts to the webhook and sends the same key only once a minute", async () => {
    let t = 1_000_000;
    const fetchMock = vi.fn(async () => ({ ok: true }) as Response);
    const a = createAlerter("https://hooks.test/x", fetchMock as unknown as typeof fetch, () => t);
    await a.alert("db", "database down");
    await a.alert("db", "database down");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await a.alert("other", "something else");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    t += 61_000;
    await a.alert("db", "database down");
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const call = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(call[1].body as string).text).toBe("[curvefit] database down");
  });

  it("never throws if the webhook is unreachable", async () => {
    const a = createAlerter("https://hooks.test/x", (async () => {
      throw new Error("network");
    }) as unknown as typeof fetch);
    await expect(a.alert("k", "m")).resolves.toBeUndefined();
  });
});
