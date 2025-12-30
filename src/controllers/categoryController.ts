import { Request as RC, Response as SC, NextFunction as NC } from "express";
import * as categoryService from "../services/categoryService";
import { RequestLogger } from "../utils/requestLogger";

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "unknown";

export const getAllCategories = async (req: RC, res: SC, next: NC) => {
  const reqLogger = new RequestLogger(req);
  try {
    const userId = req.tenant!.id;
    reqLogger.info("Listing categories", { userId });
    const cats = await categoryService.getAllCategories(userId);
    reqLogger.info("Categories listed", { userId, count: cats.length });
    res.json(cats);
  } catch (e) {
    reqLogger.error("Failed to list categories", { error: errorMessage(e) });
    next(e);
  }
};

export const getCategoryById = async (req: RC, res: SC, next: NC) => {
  const reqLogger = new RequestLogger(req);
  try {
    const userId = req.tenant!.id;
    const id = Number(req.params.id);
    reqLogger.info("Fetching category", { userId, categoryId: id });
    const cat = await categoryService.getCategoryById(userId, id);
    reqLogger.info("Category fetched", { userId, categoryId: id });
    res.json(cat);
  } catch (e) {
    reqLogger.error("Failed to fetch category", { error: errorMessage(e) });
    next(e);
  }
};

export const createCategory = async (req: RC, res: SC, next: NC) => {
  const reqLogger = new RequestLogger(req);
  try {
    const userId = req.tenant!.id;
    reqLogger.info("Creating category", { userId });
    const created = await categoryService.createCategory(userId, req.body);
    reqLogger.info("Category created", { userId, categoryId: created.id });
    res.status(201).json(created);
  } catch (e) {
    reqLogger.error("Failed to create category", { error: errorMessage(e) });
    next(e);
  }
};

export const updateCategory = async (req: RC, res: SC, next: NC) => {
  const reqLogger = new RequestLogger(req);
  try {
    const userId = req.tenant!.id;
    const id = Number(req.params.id);
    reqLogger.info("Updating category", { userId, categoryId: id });
    const updated = await categoryService.updateCategory(userId, id, req.body);
    reqLogger.info("Category updated", { userId, categoryId: id });
    res.json(updated);
  } catch (e) {
    reqLogger.error("Failed to update category", { error: errorMessage(e) });
    next(e);
  }
};

export const deleteCategory = async (req: RC, res: SC, next: NC) => {
  const reqLogger = new RequestLogger(req);
  try {
    const userId = req.tenant!.id;
    const id = Number(req.params.id);
    reqLogger.info("Deleting category", { userId, categoryId: id });
    await categoryService.deleteCategory(userId, id);
    reqLogger.info("Category deleted", { userId, categoryId: id });
    res.status(204).send();
  } catch (e) {
    reqLogger.error("Failed to delete category", { error: errorMessage(e) });
    next(e);
  }
};
