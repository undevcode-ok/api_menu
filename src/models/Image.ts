import { DataTypes as DT, Model as M, Optional as Opt } from "sequelize";
import sequelize2 from "../utils/databaseService";


export interface ImageAttributes {
id: number;
menuId: number;
url: string;
active: boolean;
createdAt?: Date;
updatedAt?: Date;
}
export type ImageCreationAttributes = Opt<ImageAttributes, "id" | "active" | "createdAt" | "updatedAt">;


export class Image extends M<ImageAttributes, ImageCreationAttributes> implements ImageAttributes {
public id!: number;
public menuId!: number;
public url!: string;
public active!: boolean;
public readonly createdAt!: Date;
public readonly updatedAt!: Date;
}


Image.init(
{
id: { type: DT.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
menuId: { type: DT.INTEGER.UNSIGNED, allowNull: false },
url: { type: DT.STRING(1024), allowNull: false },
active: { type: DT.BOOLEAN, allowNull: false, defaultValue: true },
},
{ sequelize: sequelize2, tableName: "images", modelName: "Image", timestamps: true }
);