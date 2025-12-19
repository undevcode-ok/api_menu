import { Request, Response, NextFunction } from "express";
import * as paymentService from "../services/paymentService";
import { RequestLogger } from "../utils/requestLogger";

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "unknown";

export const getAllPayments = async (req: Request, res: Response, next: NextFunction) => {
  const reqLogger = new RequestLogger(req);
  try {
    reqLogger.info("Listing payments");
    const items = await paymentService.getAllPayments();
    reqLogger.info("Payments listed", { count: items.length });
    res.json(items);
  } catch (err) {
    reqLogger.error("Failed to list payments", { error: errorMessage(err) });
    next(err);
  }
};

export const getPaymentById = async (req: Request, res: Response, next: NextFunction) => {
  const reqLogger = new RequestLogger(req);
  try {
    const id = parseInt(req.params.id, 10);
    reqLogger.info("Fetching payment", { paymentId: id });
    const item = await paymentService.getPaymentById(id);
    reqLogger.info("Payment fetched", { paymentId: id });
    res.json(item);
  } catch (err) {
    reqLogger.error("Failed to fetch payment", { error: errorMessage(err) });
    next(err);
  }
};

export const createPayment = async (req: Request, res: Response, next: NextFunction) => {
  const reqLogger = new RequestLogger(req);
  try {
    reqLogger.info("Creating payment");
    const item = await paymentService.createPayment(req.body);
    reqLogger.info("Payment created", { paymentId: item.id });
    res.status(201).json(item);
  } catch (err) {
    reqLogger.error("Failed to create payment", { error: errorMessage(err) });
    next(err);
  }
};

export const updatePayment = async (req: Request, res: Response, next: NextFunction) => {
  const reqLogger = new RequestLogger(req);
  try {
    const id = parseInt(req.params.id, 10);
    reqLogger.info("Updating payment", { paymentId: id });
    const item = await paymentService.updatePayment(id, req.body);
    reqLogger.info("Payment updated", { paymentId: id });
    res.json(item);
  } catch (err) {
    reqLogger.error("Failed to update payment", { error: errorMessage(err) });
    next(err);
  }
};

export const deletePayment = async (req: Request, res: Response, next: NextFunction) => {
  const reqLogger = new RequestLogger(req);
  try {
    const id = parseInt(req.params.id, 10);
    reqLogger.info("Deleting payment", { paymentId: id });
    const result = await paymentService.deletePayment(id);
    reqLogger.info("Payment deleted", { paymentId: id });
    res.json(result);
  } catch (err) {
    reqLogger.error("Failed to delete payment", { error: errorMessage(err) });
    next(err);
  }
};
