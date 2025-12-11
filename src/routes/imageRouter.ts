import { Router as R2 } from "express";
import { validate as v2, validate } from "../middlewares/validate";
import { createImageSchema, updateImageSchema, upsertItemImagesBodySchema } from "../validations/image.validation";
import { getAllImages, getImageById, createImage, updateImage, deleteImage, upsertItemImagesController } from "../controllers/imageController";
import multer from "multer";
import { parseMultipartPayload } from "../middlewares/parseMulti";


const imageRouter = R2();
const upload = multer();

imageRouter.get("/", getAllImages);
imageRouter.get("/:id", getImageById);
imageRouter.post("/", v2(createImageSchema), createImage);
imageRouter.put("/:id", v2(updateImageSchema), updateImage);
imageRouter.delete("/:id", deleteImage);

imageRouter.put(
    "/items/:itemId",
    upload.any(),                     
    parseMultipartPayload,             
    validate(upsertItemImagesBodySchema),  
    upsertItemImagesController  
);

export default imageRouter;