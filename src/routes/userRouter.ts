import { Router } from "express";
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  verifyResetToken,
  deleteUser,
  forgotPassword,
  restorePassword,
  activateUser
} from "../controllers/userController";
import { isAuthenticated } from "../middlewares/isAuthenticated";
import { requireAdmin } from "../middlewares/requireAdmin";
import { validate } from "../middlewares/validate";
import {
  createUserSchema,
  updateUserSchema,
  forgotPasswordSchema,
  restorePasswordSchema
} from "../validations/user.validation";

const router = Router();

router.get("/", isAuthenticated, requireAdmin, getAllUsers);
router.get("/:id", isAuthenticated, getUserById);

router.post("/", isAuthenticated, requireAdmin, validate(createUserSchema), createUser);
router.put("/:id", isAuthenticated, validate(updateUserSchema), updateUser);
router.delete("/:id", isAuthenticated, requireAdmin, deleteUser);
router.post("/:id/activate", isAuthenticated, activateUser);

router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);
router.post("/restore-password", validate(restorePasswordSchema), restorePassword);
router.get("/verify-reset-token/:token", verifyResetToken);

export default router;
