import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../utils/databaseService";
import { attachDbLengthValidator } from "../utils/lengthValidator";

interface PaymentAttributes {
  id: number;
  userId: number;            // <- INT ahora
  datePayments: string;
  endDatePayments: string;
  price: number;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PaymentCreationAttributes
  extends Optional<PaymentAttributes, "id" | "active" | "createdAt" | "updatedAt"> {}

export class Payment extends Model<PaymentAttributes, PaymentCreationAttributes>
  implements PaymentAttributes {
  public id!: number;
  public userId!: number;    // <- INT
  public datePayments!: string;
  public endDatePayments!: string;
  public price!: number;
  public active!: boolean;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Payment.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER.UNSIGNED,  
      allowNull: false,
    },
    datePayments: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    endDatePayments: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    price: {
      type: DataTypes.FLOAT.UNSIGNED,
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
    modelName: "Payment",
    tableName: "payments",
    timestamps: true,
  }
);
attachDbLengthValidator(Payment as any, "payments");
export type { PaymentAttributes };