import { Request, Response, NextFunction } from "express";
import * as imageService from "../services/imageService";
import { RequestLogger } from "../utils/requestLogger";

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "unknown";

export const getAllImages = async (req: Request, res: Response, next: NextFunction) => {
  const reqLogger = new RequestLogger(req);
  try {
    const userId = req.tenant!.id;
    reqLogger.info("Listing images", { userId });
    const imgs = await imageService.getAllImages(userId);
    reqLogger.info("Images listed", { userId, count: imgs.length });
    res.json(imgs);
  } catch (e) {
    reqLogger.error("Failed to list images", { error: errorMessage(e) });
    next(e);
  }
};

export const getImageById = async (req: Request, res: Response, next: NextFunction) => {
  const reqLogger = new RequestLogger(req);
  try {
    const userId = req.tenant!.id;
    const id = Number(req.params.id);
    reqLogger.info("Fetching image", { userId, imageId: id });
    const img = await imageService.getImageById(userId, id);
    reqLogger.info("Image fetched", { userId, imageId: id });
    res.json(img);
  } catch (e) {
    reqLogger.error("Failed to fetch image", { error: errorMessage(e) });
    next(e);
  }
};

export const createImage = async (req: Request, res: Response, next: NextFunction) => {
  const reqLogger = new RequestLogger(req);
  try {
    const userId = req.tenant!.id;
    reqLogger.info("Creating image", { userId });
    const created = await imageService.createImage(userId, req.body);
    reqLogger.info("Image created", { userId, imageId: created.id });
    res.status(201).json(created);
  } catch (e) {
    reqLogger.error("Failed to create image", { error: errorMessage(e) });
    next(e);
  }
};

export const updateImage = async (req: Request, res: Response, next: NextFunction) => {
  const reqLogger = new RequestLogger(req);
  try {
    const userId = req.tenant!.id;
    const id = Number(req.params.id);
    reqLogger.info("Updating image", { userId, imageId: id });
    const updated = await imageService.updateImage(userId, id, req.body);
    reqLogger.info("Image updated", { userId, imageId: id });
    res.json(updated);
  } catch (e) {
    reqLogger.error("Failed to update image", { error: errorMessage(e) });
    next(e);
  }
};

export const deleteImage = async (req: Request, res: Response, next: NextFunction) => {
  const reqLogger = new RequestLogger(req);
  try {
    const userId = req.tenant!.id;
    const id = Number(req.params.id);
    reqLogger.info("Deleting image", { userId, imageId: id });
    await imageService.deleteImage(userId, id);
    reqLogger.info("Image deleted", { userId, imageId: id });
    res.status(204).send();
  } catch (e) {
    reqLogger.error("Failed to delete image", { error: errorMessage(e) });
    next(e);
  }
};

/* ========= Imágenes de ÍTEMS ========= */

export const upsertItemImagesController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const reqLogger = new RequestLogger(req);
  try {
    const userId = req.tenant!.id;
    const itemId = Number(req.params.itemId);
    const images = (req.body.images ?? []) as any[];
    const files = (req.files ?? []) as Express.Multer.File[];

    reqLogger.info("Upserting item images", {
      userId,
      itemId,
      imagesCount: images.length,
      filesCount: files.length,
    });

    await imageService.upsertItemImages(userId, itemId, images, files);
    reqLogger.info("Item images upserted", { userId, itemId });

    res.status(200).json({ ok: true });
  } catch (e) {
    reqLogger.error("Failed to upsert item images", {
      error: errorMessage(e),
    });
    next(e);
  }
};
