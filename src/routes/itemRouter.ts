import { Router as R4 } from "express";
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

itemRouter.get("/", getAllItems);
itemRouter.get("/:id", getItemById);

itemRouter.post("/", validate(createItemSchema), createItem);

itemRouter.put("/:id", validate(updateItemSchema), updateItem);

itemRouter.delete("/:id", deleteItem);

export default itemRouter;
