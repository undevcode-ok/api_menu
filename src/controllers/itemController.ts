import { Request as RI, Response as SI, NextFunction as NI } from "express";
import * as itemService from "../services/itemService";

export const getAllItems = async (req: RI, res: SI, next: NI) => {
  try {
    const userId = req.tenant!.id;
    const items = await itemService.getAllItems(userId);
    res.json(items);
  } catch (e) {
    next(e);
  }
};

export const getItemById = async (req: RI, res: SI, next: NI) => {
  try {
    const userId = req.tenant!.id;
    const id = Number(req.params.id);
    const item = await itemService.getItemById(userId, id);
    res.json(item);
  } catch (e) {
    next(e);
  }
};

export const createItem = async (req: RI, res: SI, next: NI) => {
  try {
    const userId = req.tenant!.id;
    const created = await itemService.createItem(userId, req.body);
    res.status(201).json(created);
  } catch (e) {
    next(e);
  }
};

export const updateItem = async (req: RI, res: SI, next: NI) => {
  try {
    const userId = req.tenant!.id;
    const id = Number(req.params.id);
    const updated = await itemService.updateItem(userId, id, req.body);
    res.json(updated);
  } catch (e) {
    next(e);
  }
};

export const deleteItem = async (req: RI, res: SI, next: NI) => {
  try {
    const userId = req.tenant!.id;
    const id = Number(req.params.id);
    await itemService.deleteItem(userId, id);
    res.status(204).send();
  } catch (e) {
    next(e);
  }
};
