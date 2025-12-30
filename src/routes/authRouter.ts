import { Router } from "express";
import { login, googleSync } from "../controllers/authController";
import { resetPasswordController } from "../controllers/resetPasswordController";
import { isAuthenticated } from "../middlewares/isAuthenticated";
import { validate } from "../middlewares/validate";
import { loginSchema, resetPasswordSchema } from "../validations/auth.validation";

const router = Router();

router.post("/google-sync", isAuthenticated, googleSync);
router.post("/login", validate(loginSchema), login);
router.post("/reset-password", validate(resetPasswordSchema), resetPasswordController);

export default router;
