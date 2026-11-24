import type { Request, Response } from "express";
import type { SizeRequest } from "@curvefit/shared";
import type { Services } from "../services";

export const sizeController = (s: Services) => ({
  async recommend(req: Request, res: Response) {
    const result = await s.size.recommend(req.body as SizeRequest);
    res.json({ data: result });
  },
  async chart(req: Request, res: Response) {
    const chart = await s.size.getChart(String(req.params.productId));
    res.json({ data: chart });
  },
  async deleteLog(req: Request, res: Response) {
    await s.size.deleteLog(String(req.params.token));
    res.status(204).end();
  },
});
