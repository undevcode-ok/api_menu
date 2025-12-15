import { Router } from "express";
import { isAuthenticated } from "../middlewares/isAuthenticated";
import { validate } from "../middlewares/validate";
import { createMenuSchema, updateMenuSchema } from "../validations/menu.validation";
import { getAllMenus, getMenuById, createMenu, updateMenu, deleteMenu, getMenuQr, importMenuCsv } from "../controllers/menuController";
import { uploadMiddleware } from "../s3-image-module";
import { parseMultipartPayload } from "../middlewares/parseMulti";
import { csvUpload } from "../middlewares/csvUpload";


const menuRouter = Router();

menuRouter.get("/", isAuthenticated, getAllMenus);
menuRouter.get("/:id/qr", getMenuQr);
menuRouter.post("/:id/import-csv", isAuthenticated, csvUpload.single("file"), importMenuCsv);
menuRouter.get("/:id", isAuthenticated, getMenuById);
menuRouter.post("/", isAuthenticated, uploadMiddleware.any(),parseMultipartPayload, validate(createMenuSchema), createMenu);
menuRouter.put("/:id", isAuthenticated, uploadMiddleware.any(),parseMultipartPayload, validate(updateMenuSchema), updateMenu);
menuRouter.delete("/:id", isAuthenticated, deleteMenu);
export default menuRouter;
