import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { Env } from "../config/env";
import { HttpError } from "../utils/httpError";

export type ImageExt = "jpg" | "png" | "webp";

export const MAX_PHOTO_BYTES = 3 * 1024 * 1024;

/** Identifies an image by its first bytes, so a renamed file or a wrong header cannot slip in. */
export function detectImage(buf: Buffer): ImageExt | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "png";
  }
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    return "webp";
  }
  return null;
}

const CONTENT_TYPE: Record<ImageExt, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export interface PhotoStorage {
  save(data: Buffer, ext: ImageExt): Promise<string>;
  /** True only for URLs this storage produced, so reviews cannot embed arbitrary links. */
  owns(url: string): boolean;
}

const newName = (ext: ImageExt) => `${randomBytes(16).toString("hex")}.${ext}`;

export function createLocalStorage(dir: string, publicBase: string): PhotoStorage {
  const base = `${publicBase.replace(/\/$/, "")}/uploads/`;
  return {
    async save(data, ext) {
      await mkdir(dir, { recursive: true });
      const name = newName(ext);
      await writeFile(join(dir, name), data);
      return `${base}${name}`;
    },
    owns: (url) =>
      url.startsWith(base) && /^[a-f0-9]{32}\.(jpg|png|webp)$/.test(url.slice(base.length)),
  };
}

export function createS3Storage(env: Env): PhotoStorage {
  const client = new S3Client({
    region: env.S3_REGION,
    endpoint: env.S3_ENDPOINT || undefined,
    credentials: { accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY },
  });
  const base = `${env.S3_PUBLIC_BASE.replace(/\/$/, "")}/review-photos/`;
  return {
    async save(data, ext) {
      const key = `review-photos/${newName(ext)}`;
      await client.send(
        new PutObjectCommand({
          Bucket: env.S3_BUCKET,
          Key: key,
          Body: data,
          ContentType: CONTENT_TYPE[ext],
          CacheControl: "public, max-age=604800",
        }),
      );
      return `${env.S3_PUBLIC_BASE.replace(/\/$/, "")}/${key}`;
    },
    owns: (url) =>
      url.startsWith(base) && /^[a-f0-9]{32}\.(jpg|png|webp)$/.test(url.slice(base.length)),
  };
}

export const uploadDirFor = (env: Env) => resolve(env.UPLOAD_DIR || join(process.cwd(), "uploads"));

export function createPhotoStorage(env: Env): PhotoStorage {
  if (env.S3_BUCKET && env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY && env.S3_PUBLIC_BASE) {
    return createS3Storage(env);
  }
  if (env.NODE_ENV !== "production") {
    return createLocalStorage(
      uploadDirFor(env),
      env.PUBLIC_API_URL || `http://localhost:${env.PORT}`,
    );
  }
  // Most hosts wipe local disk on deploy, so production needs object storage.
  return {
    save: async () => {
      throw new HttpError(503, "UPLOADS_NOT_CONFIGURED", "Photo uploads are not available yet");
    },
    owns: () => false,
  };
}
