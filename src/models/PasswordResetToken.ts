// src/models/PasswordResetToken.ts
import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../utils/databaseService";
import { User } from "./User";

export interface PasswordResetTokenAttributes {
  id: number;
  userId: number;
  token: string;
  expiresAt: Date;
  isUsed: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

type PasswordResetTokenCreationAttributes = Optional<
  PasswordResetTokenAttributes,
  "id" | "createdAt" | "updatedAt"
>;

class PasswordResetToken
  extends Model<PasswordResetTokenAttributes, PasswordResetTokenCreationAttributes>
  implements PasswordResetTokenAttributes
{
  public id!: number;
  public userId!: number;
  public token!: string;
  public expiresAt!: Date;
  public isUsed!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public readonly user?: User;
}

PasswordResetToken.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: "user_id",
      references: {
        model: User,
        key: "id",
      },
      onDelete: "CASCADE",
    },
    token: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "expires_at",
    },
    isUsed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "is_used",
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "created_at",
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "updated_at",
    },
  },
  {
    sequelize,
    tableName: "password_reset_tokens",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        name: "uix_password_reset_tokens_token",
        unique: true,
        fields: ["token"],
      },
      {
        name: "idx_password_reset_tokens_user_id",
        fields: ["user_id"],
      },
    ],
  }
);

PasswordResetToken.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

User.hasMany(PasswordResetToken, {
  foreignKey: "userId",
  as: "resetTokens",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

export { PasswordResetToken };
