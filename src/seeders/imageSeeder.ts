import { Image } from "../models/Image";

const seedImages = async () => {
  await Image.bulkCreate([
    { menuId: 1, url: "https://picsum.photos/id/101/800/600", active: true },
    { menuId: 1, url: "https://picsum.photos/id/102/800/600", active: true },
    { menuId: 2, url: "https://picsum.photos/id/103/800/600", active: true },
    { menuId: 2, url: "https://picsum.photos/id/104/800/600", active: true }
  ]);
};

export default seedImages;