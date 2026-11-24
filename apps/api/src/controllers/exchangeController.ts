import type { Request, Response } from "express";
import type { ExchangeInput } from "@curvefit/shared";
import type { Services } from "../services";

export const exchangeController = (s: Services) => ({
  async requestOtp(req: Request, res: Response) {
    const { orderNumber, phone } = req.body as { orderNumber: string; phone: string };
    await s.exchange.requestOtp(orderNumber, phone);
    res.status(202).json({ data: { message: "If the order matches, a code has been sent" } });
  },
  async create(req: Request, res: Response) {
    const data = await s.exchange.create(req.body as ExchangeInput);
    res.status(201).json({ data });
  },
});
