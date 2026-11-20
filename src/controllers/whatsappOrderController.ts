import { NextFunction, Request, Response } from "express";
import { getPublicMenuByPublicId } from "../services/menuService";
import { OrderMenu, prepareWhatsAppOrder } from "../services/whatsappOrderService";

export async function getWhatsAppOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const menu = await getPublicMenuByPublicId(req.params.publicId);
    res.set("Cache-Control", "no-store");
    res.json(prepareWhatsAppOrder(menu.toJSON() as unknown as OrderMenu, req.body));
  } catch (error) {
    next(error);
  }
}
