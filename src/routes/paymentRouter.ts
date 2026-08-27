import { Router } from "express";
import {
  getAllPayments,
  getPaymentById,
  createPayment,
  updatePayment,
  deletePayment,
} from "../controllers/paymentController";
import { validate } from "../middlewares/validate";
import { createPaymentSchema, updatePaymentSchema } from "../validations/payment.validation";
import { isAuthenticated } from "../middlewares/isAuthenticated";
import { requireAdmin } from "../middlewares/requireAdmin";

const router = Router();

router.get("/", isAuthenticated, requireAdmin, getAllPayments);
router.get("/:id", isAuthenticated, requireAdmin, getPaymentById);
router.post("/", isAuthenticated, requireAdmin, validate(createPaymentSchema), createPayment);
router.put("/:id", isAuthenticated, requireAdmin, validate(updatePaymentSchema), updatePayment);
router.delete("/:id", isAuthenticated, requireAdmin, deletePayment);

export default router;
