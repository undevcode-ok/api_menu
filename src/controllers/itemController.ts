import { Request as RI, Response as SI, NextFunction as NI } from "express";
import * as itemService from "../services/itemService";
import { RequestLogger } from "../utils/requestLogger";

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "unknown";

export const getAllItems = async (req: RI, res: SI, next: NI) => {
  const reqLogger = new RequestLogger(req);
  try {
    const userId = req.tenant!.id;
    reqLogger.info("Listing items", { userId });
    const items = await itemService.getAllItems(userId);
    reqLogger.info("Items listed", { userId, count: items.length });
    res.json(items);
  } catch (e) {
    reqLogger.error("Failed to list items", { error: errorMessage(e) });
    next(e);
  }
};

export const getItemById = async (req: RI, res: SI, next: NI) => {
  const reqLogger = new RequestLogger(req);
  try {
    const userId = req.tenant!.id;
    const id = Number(req.params.id);
    reqLogger.info("Fetching item", { userId, itemId: id });
    const item = await itemService.getItemById(userId, id);
    reqLogger.info("Item fetched", { userId, itemId: id });
    res.json(item);
  } catch (e) {
    reqLogger.error("Failed to fetch item", { error: errorMessage(e) });
    next(e);
  }
};

export const createItem = async (req: RI, res: SI, next: NI) => {
  const reqLogger = new RequestLogger(req);
  try {
    const userId = req.tenant!.id;
    reqLogger.info("Creating item", { userId });
    const created = await itemService.createItem(userId, req.body);
    reqLogger.info("Item created", { userId, itemId: created.id });
    res.status(201).json(created);
  } catch (e) {
    reqLogger.error("Failed to create item", { error: errorMessage(e) });
    next(e);
  }
};

export const updateItem = async (req: RI, res: SI, next: NI) => {
  const reqLogger = new RequestLogger(req);
  try {
    const userId = req.tenant!.id;
    const id = Number(req.params.id);
    reqLogger.info("Updating item", { userId, itemId: id });
    const updated = await itemService.updateItem(userId, id, req.body);
    reqLogger.info("Item updated", { userId, itemId: id });
    res.json(updated);
  } catch (e) {
    reqLogger.error("Failed to update item", { error: errorMessage(e) });
    next(e);
  }
};

export const deleteItem = async (req: RI, res: SI, next: NI) => {
  const reqLogger = new RequestLogger(req);
  try {
    const userId = req.tenant!.id;
    const id = Number(req.params.id);
    reqLogger.info("Deleting item", { userId, itemId: id });
    await itemService.deleteItem(userId, id);
    reqLogger.info("Item deleted", { userId, itemId: id });
    res.status(204).send();
  } catch (e) {
    reqLogger.error("Failed to delete item", { error: errorMessage(e) });
    next(e);
  }
};
