import type { ReviewInput, ReviewListQuery } from "@curvefit/shared";
import { ReviewModel } from "../models/Review";
import { badRequest, notFound } from "../utils/httpError";
import { MAX_PHOTO_BYTES, type PhotoStorage, detectImage } from "./photoStorage";

/** How close height and hip must be (cm) for a review to count as "people like me". */
const HEIGHT_TOLERANCE = 8;
const HIP_TOLERANCE = 8;

export interface ReviewService {
  list(productId: string, filters: ReviewListQuery): Promise<unknown[]>;
  listByStatus(status: "pending" | "approved" | "rejected"): Promise<unknown[]>;
  create(input: ReviewInput): Promise<{ id: string; status: string }>;
  setStatus(id: string, status: "approved" | "rejected"): Promise<void>;
  /** Stores a review photo and returns its public URL. */
  uploadPhoto(data: Buffer): Promise<{ url: string }>;
}

export function createReviewService(storage: PhotoStorage): ReviewService {
  return {
    async list(productId, filters) {
      const query: Record<string, unknown> = { productId, status: "approved" };
      if (filters.size) query.sizeWorn = filters.size;
      if (filters.fit) query.fit = filters.fit;
      if (filters.heightCm !== undefined) {
        query.heightCm = {
          $gte: filters.heightCm - HEIGHT_TOLERANCE,
          $lte: filters.heightCm + HEIGHT_TOLERANCE,
        };
      }
      if (filters.hipCm !== undefined) {
        query.hipCm = { $gte: filters.hipCm - HIP_TOLERANCE, $lte: filters.hipCm + HIP_TOLERANCE };
      }
      return ReviewModel.find(query).sort({ createdAt: -1 }).limit(50).lean();
    },
    async listByStatus(status) {
      return ReviewModel.find({ status }).sort({ createdAt: -1 }).limit(100).lean();
    },
    async create(input) {
      if (!input.photoUrls.every((u) => storage.owns(u))) {
        throw badRequest("Photos must be uploaded through the site", "INVALID_PHOTO");
      }
      const doc = await ReviewModel.create({ ...input, status: "pending" });
      return { id: String(doc._id), status: doc.status };
    },
    async setStatus(id, status) {
      const doc = await ReviewModel.findByIdAndUpdate(id, { status });
      if (!doc) throw notFound("Review not found");
    },
    async uploadPhoto(data) {
      if (data.length === 0) throw badRequest("No image received", "INVALID_PHOTO");
      if (data.length > MAX_PHOTO_BYTES)
        throw badRequest("Image is larger than 3 MB", "PHOTO_TOO_LARGE");
      const ext = detectImage(data);
      if (!ext) throw badRequest("Use a JPEG, PNG or WebP image", "INVALID_PHOTO");
      return { url: await storage.save(data, ext) };
    },
  };
}
