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
import { validate } from "../middlewares/validate";
import {
  createUserSchema,
  updateUserSchema,
  forgotPasswordSchema,
  restorePasswordSchema
} from "../validations/user.validation";

const router = Router();

router.get("/", isAuthenticated, getAllUsers);
router.get("/:id", isAuthenticated, getUserById);

router.post("/", isAuthenticated, validate(createUserSchema), createUser);
router.put("/:id", isAuthenticated, validate(updateUserSchema), updateUser);
router.delete("/:id", isAuthenticated, deleteUser);
router.post("/:id/activate", isAuthenticated, activateUser);

router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);
router.post("/restore-password", isAuthenticated, validate(restorePasswordSchema), restorePassword);
router.get("/verify-reset-token/:token", isAuthenticated, verifyResetToken);

export default router;
