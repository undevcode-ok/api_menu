import { Router } from "express";
import { getPublicMenu } from "../controllers/menuController";

const publicMenuRouter = Router();

publicMenuRouter.get("/:publicId", getPublicMenu);

export default publicMenuRouter;
