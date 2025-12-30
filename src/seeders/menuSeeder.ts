import { Menu } from "../models/Menu";

const seedMenus = async () => {
  await Menu.bulkCreate([
    {
      userId: 1,
      publicId: "00000000-0000-0000-0000-000000000001",
      title: "Pizzería Don Pepe",
      active: true,
      logo: "https://picsum.photos/seed/donpepe-logo/256/256",
      backgroundImage: "https://picsum.photos/seed/donpepe-bg/1200/600",
      color: { primary: "#D32F2F", secondary: "#212121" },// rojo + gris oscuro
      pos: "Sucursal Centro, Sucursal Palermo"
    },
    {
      userId: 1,
      publicId: "00000000-0000-0000-0000-000000000002",
      title: "Cafetería La Plaza",
      active: true,
      logo: "https://picsum.photos/seed/laplaza-logo/256/256",
      backgroundImage: "https://picsum.photos/seed/laplaza-bg/1200/600",
      color: { primary: "#6A4E23", secondary: "#2B2B2B" }, // marrón café + gris oscuro
      pos: "Sucursal Centro, Sucursal Palermo soho"
    }
  ]);
};

export default seedMenus;
