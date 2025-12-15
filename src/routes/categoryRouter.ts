import { Router as R3 } from "express";
import { isAuthenticated } from "../middlewares/isAuthenticated";
import { validate } from "../middlewares/validate";
import {
  createCategorySchema,
  updateCategorySchema,
} from "../validations/category.validation";
import {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/categoryController";

const categoryRouter = R3();

categoryRouter.get("/", isAuthenticated, getAllCategories);
categoryRouter.get("/:id", isAuthenticated, getCategoryById);

categoryRouter.post(
  "/",
  isAuthenticated,
  validate(createCategorySchema),
  createCategory
);

categoryRouter.put(
  "/:id",
  isAuthenticated,
  validate(updateCategorySchema),
  updateCategory
);

categoryRouter.delete("/:id", isAuthenticated, deleteCategory);

export default categoryRouter;
