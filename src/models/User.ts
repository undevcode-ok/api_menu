// src/models/User.ts
import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../utils/databaseService";
import argon2 from "argon2";
import { attachDbLengthValidator } from "../utils/lengthValidator";

export interface UserAttributes {
  id: number;
  name: string;
  lastName: string;
  email: string;
  cel?: string | null;        // ← opcional
  roleId: number;
  active: boolean;
  passwordHash: string;
  password?: string; 
  subdomain?: string | null;  // ← opcional
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserCreationAttributes
  extends Optional<
    UserAttributes,
    "id" | "active" | "createdAt" | "updatedAt" | "passwordHash" | "cel" | "subdomain"
  > {
  password: string;
}

export class User
  extends Model<UserAttributes, UserCreationAttributes>
  implements UserAttributes
{
  public id!: number;
  public name!: string;
  public lastName!: string;
  public email!: string;
  public cel?: string | null;
  public roleId!: number;
  public active!: boolean;
  public passwordHash!: string;
  public password?: string;
  public subdomain?: string | null;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  async validatePassword(plain: string) {
    return argon2.verify(this.passwordHash, plain);
  }

  toJSON() {
    const v = { ...this.get() } as any;
    delete v.passwordHash;
    delete v.password;
    return v;
  }
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },

    name: { type: DataTypes.STRING, allowNull: false },
    lastName: { type: DataTypes.STRING, allowNull: false },

    email: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { isEmail: true },
    },

    cel: { type: DataTypes.STRING, allowNull: true },         // ← cambiado
    roleId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },

    password: {
      type: DataTypes.VIRTUAL,
      set(value: string) {
        const trimmed = typeof value === "string" ? value.trim() : value;
        (this as any).setDataValue("password", trimmed);
      },
      validate: { len: [8, 16] },
    },

    passwordHash: { type: DataTypes.STRING(255), allowNull: false },

    subdomain: { type: DataTypes.STRING, allowNull: true },   // ← cambiado
  },
  {
    sequelize,
    modelName: "User",
    tableName: "users",
    timestamps: true,

    defaultScope: { attributes: { exclude: ["passwordHash"] } },
    scopes: {
      withHash: { attributes: { include: ["passwordHash"] } },
    },

    hooks: {
      async beforeSave(user: User) {
        if (typeof user.email === "string") {
          user.email = user.email.trim().toLowerCase();
        }

        if (user.isNewRecord) {
          const pwd = (user.password ?? "").trim();
          if (!pwd) throw new Error("Password is required");
          if (pwd.length < 8 || pwd.length > 16)
            throw new Error("Password must be between 8 and 16 characters.");
          user.passwordHash = await argon2.hash(pwd);
          return;
        }

        if (typeof user.password === "string") {
          const pwd = user.password.trim();
          if (pwd.length === 0) {
            (user as any).password = undefined;
            return;
          }
          if (pwd.length < 8 || pwd.length > 16)
            throw new Error("Password must be between 8 and 16 characters.");
          user.passwordHash = await argon2.hash(pwd);
        }
      },
    },

    indexes: [
      {
        name: "users_email_unique",
        unique: true,
        fields: ["email"],
      },
      {
        name: "users_subdomain_unique",
        unique: true,
        fields: ["subdomain"],
      },
    ],
  }
);

attachDbLengthValidator(User as any, "users");
export default User;
