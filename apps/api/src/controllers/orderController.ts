import type { Request, Response } from "express";
import type { Services } from "../services";

export const orderController = (s: Services) => ({
  async track(req: Request, res: Response) {
    const { orderNumber, phone } = req.body as { orderNumber: string; phone: string };
    res.json({ data: await s.orders.track(orderNumber, phone) });
  },
});
