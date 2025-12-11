import { Request, Response, NextFunction } from "express";
import * as paymentService from "../services/paymentService";

export const getAllPayments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await paymentService.getAllPayments();
    res.json(items);
  } catch (err) {
    next(err);
  }
};

export const getPaymentById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await paymentService.getPaymentById(parseInt(req.params.id, 10));
    res.json(item);
  } catch (err) {
    next(err);
  }
};

export const createPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await paymentService.createPayment(req.body);
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
};

export const updatePayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await paymentService.updatePayment(parseInt(req.params.id, 10), req.body);
    res.json(item);
  } catch (err) {
    next(err);
  }
};

export const deletePayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await paymentService.deletePayment(parseInt(req.params.id, 10));
    res.json(result);
  } catch (err) {
    next(err);
  }
};