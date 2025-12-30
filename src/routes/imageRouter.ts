import { Router as R2 } from "express";
import { isAuthenticated } from "../middlewares/isAuthenticated";
import { validate as v2, validate } from "../middlewares/validate";
import { createImageSchema, updateImageSchema, upsertItemImagesBodySchema } from "../validations/image.validation";
import { getAllImages, getImageById, createImage, updateImage, deleteImage, upsertItemImagesController } from "../controllers/imageController";
import multer from "multer";
import { parseMultipartPayload } from "../middlewares/parseMulti";


const imageRouter = R2();
const upload = multer();

imageRouter.get("/", isAuthenticated, getAllImages);
imageRouter.get("/:id", isAuthenticated, getImageById);
imageRouter.post("/", isAuthenticated, v2(createImageSchema), createImage);
imageRouter.put("/:id", isAuthenticated, v2(updateImageSchema), updateImage);
imageRouter.delete("/:id", isAuthenticated, deleteImage);

imageRouter.put(
    "/items/:itemId",
    isAuthenticated,
    upload.any(),                     
    parseMultipartPayload,             
    validate(upsertItemImagesBodySchema),  
    upsertItemImagesController  
);

export default imageRouter;
