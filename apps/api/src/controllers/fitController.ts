import type { Request, Response } from "express";
import type { FitSessionInput } from "@curvefit/shared";
import type { Services } from "../services";

export const fitController = (s: Services) => ({
  async create(req: Request, res: Response) {
    res.status(201).json({ data: await s.fit.create(req.body as FitSessionInput) });
  },
  async list(req: Request, res: Response) {
    res.json({ data: await s.fit.list(String(req.params.productId)) });
  },
  async remove(req: Request, res: Response) {
    await s.fit.remove(String(req.params.id));
    res.status(204).end();
  },
  async suggest(req: Request, res: Response) {
    res.json({ data: await s.fit.suggest(String(req.params.productId)) });
  },
});
