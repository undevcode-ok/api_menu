import { Request as RC, Response as SC, NextFunction as NC } from "express";
import * as categoryService from "../services/categoryService";

export const getAllCategories = async (req: RC, res: SC, next: NC) => {
  try {
    const userId = req.tenant!.id;
    const cats = await categoryService.getAllCategories(userId);
    res.json(cats);
  } catch (e) {
    next(e);
  }
};

export const getCategoryById = async (req: RC, res: SC, next: NC) => {
  try {
    const userId = req.tenant!.id;
    const id = Number(req.params.id);
    const cat = await categoryService.getCategoryById(userId, id);
    res.json(cat);
  } catch (e) {
    next(e);
  }
};

export const createCategory = async (req: RC, res: SC, next: NC) => {
  try {
    const userId = req.tenant!.id;
    const created = await categoryService.createCategory(userId, req.body);
    res.status(201).json(created);
  } catch (e) {
    next(e);
  }
};

export const updateCategory = async (req: RC, res: SC, next: NC) => {
  try {
    const userId = req.tenant!.id;
    const id = Number(req.params.id);
    const updated = await categoryService.updateCategory(userId, id, req.body);
    res.json(updated);
  } catch (e) {
    next(e);
  }
};

export const deleteCategory = async (req: RC, res: SC, next: NC) => {
  try {
    const userId = req.tenant!.id;
    const id = Number(req.params.id);
    await categoryService.deleteCategory(userId, id);
    res.status(204).send();
  } catch (e) {
    next(e);
  }
};
