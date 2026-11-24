import type { Request, Response } from "express";
import type { RestockAlertInput, WaitlistInput } from "@curvefit/shared";
import type { Services } from "../services";

export const waitlistController = (s: Services) => ({
  async join(req: Request, res: Response) {
    const data = await s.waitlist.join(req.body as WaitlistInput);
    res.status(201).json({ data });
  },
  async restock(req: Request, res: Response) {
    await s.waitlist.addRestockAlert(req.body as RestockAlertInput);
    res.status(202).json({ data: { message: "We will let you know when it is back" } });
  },
});
