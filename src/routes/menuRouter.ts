import { Router } from "express";
import { validate } from "../middlewares/validate";
import { createMenuSchema, updateMenuSchema } from "../validations/menu.validation";
import { getAllMenus, getMenuById, createMenu, updateMenu, deleteMenu, getMenuQr, importMenuCsv } from "../controllers/menuController";
import { uploadMiddleware } from "../s3-image-module";
import { parseMultipartPayload } from "../middlewares/parseMulti";
import { csvUpload } from "../middlewares/csvUpload";


const menuRouter = Router();

menuRouter.get("/", getAllMenus);
menuRouter.get("/:id/qr", getMenuQr);
menuRouter.post("/:id/import-csv", csvUpload.single("file"), importMenuCsv);
menuRouter.get("/:id", getMenuById);
menuRouter.post("/", uploadMiddleware.any(),parseMultipartPayload, validate(createMenuSchema), createMenu);
menuRouter.put("/:id", uploadMiddleware.any(),parseMultipartPayload, validate(updateMenuSchema), updateMenu);
menuRouter.delete("/:id", deleteMenu);
export default menuRouter;
