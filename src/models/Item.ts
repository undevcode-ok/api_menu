import { DataTypes as DT4, Model as M4, Optional as Opt4 } from "sequelize";
import sequelize4 from "../utils/databaseService";


export interface ItemAttributes {
id: number;
categoryId: number; // (categoriaId)
title: string;
description: string | null;
price: number | null; // store as DECIMAL(10,2)
active: boolean;
position: number;
createdAt?: Date;
updatedAt?: Date;
}
export type ItemCreationAttributes = Opt4<
  ItemAttributes,
  "id" | "description" | "price" | "active" | "createdAt" | "updatedAt" | "position"
>;


export class Item extends M4<ItemAttributes, ItemCreationAttributes> implements ItemAttributes {
public id!: number;
public categoryId!: number;
public title!: string;
public description!: string | null;
public price!: number | null;
public active!: boolean;
public position!: number;
public readonly createdAt!: Date;
public readonly updatedAt!: Date;
}


Item.init(
{
id: { type: DT4.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
categoryId: { field: "categoryId", type: DT4.INTEGER.UNSIGNED, allowNull: false },
title: { type: DT4.STRING(160), allowNull: false },
description: { type: DT4.STRING(500), allowNull: true },
price: { type: DT4.DECIMAL(10, 2), allowNull: true },
active: { type: DT4.BOOLEAN, allowNull: false, defaultValue: true },
position: { type: DT4.INTEGER.UNSIGNED, allowNull: false, defaultValue: 10000 },
},
{ sequelize: sequelize4, tableName: "items", modelName: "Item", timestamps: true }
);
