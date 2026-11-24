import type { Request, Response } from "express";
import type { ReviewInput, ReviewListQuery } from "@curvefit/shared";
import type { Services } from "../services";
import { HttpError } from "../utils/httpError";

export const reviewController = (s: Services) => ({
  async list(req: Request, res: Response) {
    const data = await s.reviews.list(String(req.params.productId), req.query as ReviewListQuery);
    res.json({ data });
  },
  async create(req: Request, res: Response) {
    const data = await s.reviews.create(req.body as ReviewInput);
    res.status(201).json({ data });
  },
  async uploadPhoto(req: Request, res: Response) {
    // express.raw only fills the body for image content types; anything else stays an object.
    if (!Buffer.isBuffer(req.body)) {
      throw new HttpError(415, "UNSUPPORTED_MEDIA", "Send a JPEG, PNG or WebP image");
    }
    res.status(201).json({ data: await s.reviews.uploadPhoto(req.body) });
  },
});
