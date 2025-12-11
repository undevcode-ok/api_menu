import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../utils/databaseService";
import { attachDbLengthValidator } from "../utils/lengthValidator";


interface RoleAttributes {
  id: number;
  role: string;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface RoleCreationAttributes extends Optional<RoleAttributes, "id" | "active" | "createdAt" | "updatedAt"> {}

export class Role extends Model<RoleAttributes, RoleCreationAttributes> implements RoleAttributes {
  public id!: number;
  public role!: string;
  public active!: boolean;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Role.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    role: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    sequelize,
    modelName: "Role",
    tableName: "roles",
    timestamps: true,
  }
);
attachDbLengthValidator(Role as any, "roles");
export type { RoleCreationAttributes };