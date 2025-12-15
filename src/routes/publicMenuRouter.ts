import { Router } from "express";
import { getPublicMenu } from "../controllers/menuController";

const publicMenuRouter = Router();

publicMenuRouter.get("/:id", getPublicMenu);

export default publicMenuRouter;
