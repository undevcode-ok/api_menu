import { Router as R4 } from "express";
import { isAuthenticated } from "../middlewares/isAuthenticated";
import { validate } from "../middlewares/validate";
import {
  createItemSchema,
  updateItemSchema,
} from "../validations/item.validation";
import {
  getAllItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
} from "../controllers/itemController";

const itemRouter = R4();

itemRouter.get("/", isAuthenticated, getAllItems);
itemRouter.get("/:id", isAuthenticated, getItemById);

itemRouter.post("/", isAuthenticated, validate(createItemSchema), createItem);

itemRouter.put("/:id", isAuthenticated, validate(updateItemSchema), updateItem);

itemRouter.delete("/:id", isAuthenticated, deleteItem);

export default itemRouter;
