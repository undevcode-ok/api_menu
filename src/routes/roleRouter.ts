import { Router } from "express";
import {
  getAllRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
} from "../controllers/roleController";
import { isAuthenticated } from "../middlewares/isAuthenticated";
import { requireAdmin } from "../middlewares/requireAdmin";
import { validate } from "../middlewares/validate";
import {
  createRoleSchema,
  updateRoleSchema,
} from "../validations/role.validation";

const router = Router();

router.get("/", isAuthenticated, requireAdmin, getAllRoles);
router.get("/:id", isAuthenticated, requireAdmin, getRoleById);

router.post("/", isAuthenticated, requireAdmin, validate(createRoleSchema), createRole);
router.put("/:id", isAuthenticated, requireAdmin, validate(updateRoleSchema), updateRole);
router.delete("/:id", isAuthenticated, requireAdmin, deleteRole);

export default router;
