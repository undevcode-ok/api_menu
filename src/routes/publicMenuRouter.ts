import { Router } from "express";
import { getPublicMenu } from "../controllers/menuController";
import { getWhatsAppOrder } from "../controllers/whatsappOrderController";
import { validate } from "../middlewares/validate";
import { whatsappOrderSchema } from "../validations/whatsapp.validation";

const publicMenuRouter = Router();

publicMenuRouter.get("/:publicId", getPublicMenu);
publicMenuRouter.post("/:publicId/whatsapp-order", validate(whatsappOrderSchema), getWhatsAppOrder);

export default publicMenuRouter;
