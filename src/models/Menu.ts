import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../utils/databaseService";


export interface MenuColor {
  primary: string;   // HEX "#RRGGBB"
  secondary: string; // HEX "#RRGGBB"
}



export interface MenuAttributes {
id: number;
userId: number;
title: string;
active: boolean;

logo?: string | null;
backgroundImage?: string | null;
color?: MenuColor | null;

pos?: string | null;
createdAt?: Date;
updatedAt?: Date;
}


export type MenuCreationAttributes = Optional<MenuAttributes, "id" | "active" | "createdAt" | "updatedAt">;


export class Menu extends Model<MenuAttributes, MenuCreationAttributes> implements MenuAttributes {
public id!: number;
public userId!: number;
public title!: string;
public active!: boolean;
public logo!: string | null;
public backgroundImage!: string | null;
public color!: MenuColor | null;
public pos!: string | null;
public readonly createdAt!: Date;
public readonly updatedAt!: Date;
}


Menu.init(
{
id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
title: { type: DataTypes.STRING(120), allowNull: false },
active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
logo: { type: DataTypes.STRING(255), allowNull: true, comment: "URL del logo" },
backgroundImage: { type: DataTypes.STRING(255), allowNull: true, comment: "URL de imagen de fondo" },
color: { type: DataTypes.JSON, allowNull: true, comment: "Objeto { primary, secondary } en HEX" },
pos: { type: DataTypes.STRING(255), allowNull: true, comment: "Nombre o descripción de los puntos de venta" },
},
{ sequelize, tableName: "menus", modelName: "Menu", timestamps: true }
);