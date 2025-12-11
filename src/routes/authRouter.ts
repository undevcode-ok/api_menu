import { Router } from "express";
import { login, googleSync } from "../controllers/authController";
import { resetPasswordController } from "../controllers/resetPasswordController";
import { validate } from "../middlewares/validate";
import { loginSchema, resetPasswordSchema } from "../validations/auth.validation";

const router = Router();

router.post("/google-sync", googleSync);
router.post("/login", validate(loginSchema), login);
router.post("/reset-password", validate(resetPasswordSchema), resetPasswordController);

export default router;
