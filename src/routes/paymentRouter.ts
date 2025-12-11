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

const router = Router();

router.get("/",  isAuthenticated,  getAllPayments);
router.get("/:id",  isAuthenticated, getPaymentById);
router.post("/", isAuthenticated, validate(createPaymentSchema), createPayment);
router.put("/:id",  isAuthenticated,  validate(updatePaymentSchema), updatePayment);
router.delete("/:id",  isAuthenticated,  deletePayment);

export default router;