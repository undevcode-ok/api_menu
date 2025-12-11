import { Router as R3 } from "express";
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

categoryRouter.get("/", getAllCategories);
categoryRouter.get("/:id", getCategoryById);

categoryRouter.post(
  "/",
  validate(createCategorySchema),
  createCategory
);

categoryRouter.put(
  "/:id",
  validate(updateCategorySchema),
  updateCategory
);

categoryRouter.delete("/:id", deleteCategory);

export default categoryRouter;
