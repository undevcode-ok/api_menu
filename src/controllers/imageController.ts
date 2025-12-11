import { Request, Response, NextFunction } from "express";
import * as imageService from "../services/imageService";

export const getAllImages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.tenant!.id;
    const imgs = await imageService.getAllImages(userId);
    res.json(imgs);
  } catch (e) {
    next(e);
  }
};

export const getImageById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.tenant!.id;
    const id = Number(req.params.id);
    const img = await imageService.getImageById(userId, id);
    res.json(img);
  } catch (e) {
    next(e);
  }
};

export const createImage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.tenant!.id;
    const created = await imageService.createImage(userId, req.body);
    res.status(201).json(created);
  } catch (e) {
    next(e);
  }
};

export const updateImage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.tenant!.id;
    const id = Number(req.params.id);
    const updated = await imageService.updateImage(userId, id, req.body);
    res.json(updated);
  } catch (e) {
    next(e);
  }
};

export const deleteImage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.tenant!.id;
    const id = Number(req.params.id);
    await imageService.deleteImage(userId, id);
    res.status(204).send();
  } catch (e) {
    next(e);
  }
};

/* ========= Imágenes de ÍTEMS ========= */

export const upsertItemImagesController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.tenant!.id;
    const itemId = Number(req.params.itemId);
    const images = (req.body.images ?? []) as any[];
    const files = (req.files ?? []) as Express.Multer.File[];

    await imageService.upsertItemImages(userId, itemId, images, files);

    res.status(200).json({ ok: true });
  } catch (e) {
    next(e);
  }
};
