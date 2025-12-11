import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../utils/databaseService";


interface ItemImageAttrs {
id: number;
itemId: number;
url: string;
alt?: string | null;
sortOrder: number;
active: boolean;
createdAt?: Date;
updatedAt?: Date;
}


export type ItemImageCreation = Optional<ItemImageAttrs, "id" | "alt" | "sortOrder" | "active">;


class ItemImage extends Model<ItemImageAttrs, ItemImageCreation> implements ItemImageAttrs {
public id!: number;
public itemId!: number;
public url!: string;
public alt!: string | null;
public sortOrder!: number;
public active!: boolean;
public readonly createdAt!: Date;
public readonly updatedAt!: Date;
}


ItemImage.init(
{
id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
itemId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
url: { type: DataTypes.STRING(1024), allowNull: false },
alt: { type: DataTypes.STRING(255), allowNull: true },
sortOrder: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
},
{ sequelize, tableName: "item_images", modelName: "ItemImage", timestamps: true }
);


export default ItemImage;