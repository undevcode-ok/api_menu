import { Category } from "../models/Category";

const seedCategories = async () => {
  const GAP = 10000;
  await Category.bulkCreate([
    { menuId: 1, title: "Pizzas", active: true, position: GAP },
    { menuId: 1, title: "Empanadas", active: true, position: GAP * 2 },
    { menuId: 2, title: "Cafetería", active: true, position: GAP },
    { menuId: 2, title: "Pastelería", active: true, position: GAP * 2 }
  ]);
};

export default seedCategories;
