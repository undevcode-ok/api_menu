import { User } from "./User";
import { Role } from "./Role";
import { Payment } from "./Payment";   
import { Menu as MenuA } from "./Menu";
import { Category as CategoryA } from "./Category";
import { Image as ImageA } from "./Image";
import { Item as ItemA } from "./Item";
import ItemImage from "./ItemImage";

export const setupAssociations = () => {

    // User - Role
  Role.hasMany(User, { foreignKey: "roleId", as: "users" });
  User.belongsTo(Role, { foreignKey: "roleId", as: "role" });

  // User - Payment  
  User.hasMany(Payment, { foreignKey: "userId", as: "payments" });
  Payment.belongsTo(User, { foreignKey: "userId", as: "user" });

  MenuA.hasMany(CategoryA, { foreignKey: "menuId", as: "categories", onDelete: "CASCADE", hooks: true });
  CategoryA.belongsTo(MenuA, { foreignKey: "menuId", as: "menu", onDelete: "CASCADE" });


  MenuA.hasMany(ImageA, { foreignKey: "menuId", as: "images" });
  ImageA.belongsTo(MenuA, { foreignKey: "menuId", as: "menu" });


  CategoryA.hasMany(ItemA, { foreignKey: "categoryId", as: "items", onDelete: "CASCADE", hooks: true });
  ItemA.belongsTo(CategoryA, { foreignKey: "categoryId", as: "category", onDelete: "CASCADE" });

  // Item 1–N ItemImage
  ItemA.hasMany(ItemImage, { as: "images", foreignKey: "itemId", onDelete: "CASCADE", hooks: true,});
  ItemImage.belongsTo(ItemA, { as: "item", foreignKey: "itemId" });
};
