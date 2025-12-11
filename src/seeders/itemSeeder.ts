import { Item } from "../models/Item";
import ItemImage from "../models/ItemImage";

const seedItems = async () => {
  // Limpiar tablas (opcional)
  // await ItemImage.destroy({ where: {}, truncate: true, cascade: true });
  // await Item.destroy({ where: {}, truncate: true, cascade: true });

  // 1️⃣ Crear los ítems (sin imageId)
  const items = await Item.bulkCreate(
    [
      {
        categoryId: 1,
        title: "Muzzarella",
        description: "Clásica pizza de muzza con orégano",
        price: 7500.0,
        active: true,
      },
      {
        categoryId: 1,
        title: "Napolitana",
        description: "Con tomate y ajo",
        price: 8300.0,
        active: true,
      },
      {
        categoryId: 2,
        title: "Empanada de carne",
        description: "Cortada a cuchillo, bien jugosa",
        price: 1300.0,
        active: true,
      },
      {
        categoryId: 3,
        title: "Café latte",
        description: "Leche vaporizada con espresso intenso",
        price: 2500.0,
        active: true,
      },
      {
        categoryId: 4,
        title: "Cheesecake",
        description: "Clásico con salsa de frutos rojos",
        price: 4200.0,
        active: true,
      },
    ],
    { returning: true }
  );

  // 2️⃣ Crear las imágenes relacionadas (3 por ítem)
  await ItemImage.bulkCreate([
    // Muzzarella
    { itemId: items[0].id, url: "https://picsum.photos/id/10/800/600", alt: "Pizza muzzarella 1", sortOrder: 0 },
    { itemId: items[0].id, url: "https://picsum.photos/id/11/800/600", alt: "Pizza muzzarella 2", sortOrder: 1 },
    { itemId: items[0].id, url: "https://picsum.photos/id/12/800/600", alt: "Pizza muzzarella 3", sortOrder: 2 },

    // Napolitana
    { itemId: items[1].id, url: "https://picsum.photos/id/13/800/600", alt: "Pizza napolitana 1", sortOrder: 0 },
    { itemId: items[1].id, url: "https://picsum.photos/id/14/800/600", alt: "Pizza napolitana 2", sortOrder: 1 },
    { itemId: items[1].id, url: "https://picsum.photos/id/15/800/600", alt: "Pizza napolitana 3", sortOrder: 2 },

    // Empanada
    { itemId: items[2].id, url: "https://picsum.photos/id/16/800/600", alt: "Empanada de carne 1", sortOrder: 0 },
    { itemId: items[2].id, url: "https://picsum.photos/id/17/800/600", alt: "Empanada de carne 2", sortOrder: 1 },
    { itemId: items[2].id, url: "https://picsum.photos/id/18/800/600", alt: "Empanada de carne 3", sortOrder: 2 },

    // Café latte
    { itemId: items[3].id, url: "https://picsum.photos/id/19/800/600", alt: "Café latte 1", sortOrder: 0 },
    { itemId: items[3].id, url: "https://picsum.photos/id/20/800/600", alt: "Café latte 2", sortOrder: 1 },
    { itemId: items[3].id, url: "https://picsum.photos/id/21/800/600", alt: "Café latte 3", sortOrder: 2 },

    // Cheesecake
    { itemId: items[4].id, url: "https://picsum.photos/id/22/800/600", alt: "Cheesecake 1", sortOrder: 0 },
    { itemId: items[4].id, url: "https://picsum.photos/id/23/800/600", alt: "Cheesecake 2", sortOrder: 1 },
    { itemId: items[4].id, url: "https://picsum.photos/id/24/800/600", alt: "Cheesecake 3", sortOrder: 2 },
  ]);

  console.log("✅ Seed de items + imágenes completada correctamente");
};

export default seedItems;

