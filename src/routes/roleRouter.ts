import { Router } from "express";
import {
  getAllRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
} from "../controllers/roleController";
import { isAuthenticated } from "../middlewares/isAuthenticated";
import { validate } from "../middlewares/validate";
import {
  createRoleSchema,
  updateRoleSchema,
} from "../validations/role.validation";

const router = Router();

router.get("/", isAuthenticated, getAllRoles);
router.get("/:id", isAuthenticated, getRoleById);

router.post("/", isAuthenticated, validate(createRoleSchema), createRole);
router.put("/:id", isAuthenticated,validate(updateRoleSchema), updateRole);
router.delete("/:id", isAuthenticated, deleteRole);

export default router;