import { Router } from "express";
import { getMe, googleSync, login, registerFree } from "../controllers/authController";
import { resetPasswordController } from "../controllers/resetPasswordController";
import { isAuthenticated } from "../middlewares/isAuthenticated";
import { validate } from "../middlewares/validate";
import { loginSchema, registerFreeSchema, resetPasswordSchema } from "../validations/auth.validation";

const router = Router();

router.post("/google-sync", isAuthenticated, googleSync);
router.post("/register-free", validate(registerFreeSchema), registerFree);
router.post("/login", validate(loginSchema), login);
router.get("/me", isAuthenticated, getMe);
router.post("/reset-password", validate(resetPasswordSchema), resetPasswordController);

export default router;
