import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../utils/databaseService";

export interface ImageUploadEventAttributes {
  id: number;
  userId: number;
  itemId: number;
  sourceSizeBytes: number;
  sourceMimeType: string;
  createdAt?: Date;
}

export type ImageUploadEventCreationAttributes = Optional<
  ImageUploadEventAttributes,
  "id" | "createdAt"
>;

export class ImageUploadEvent
  extends Model<ImageUploadEventAttributes, ImageUploadEventCreationAttributes>
  implements ImageUploadEventAttributes
{
  public id!: number;
  public userId!: number;
  public itemId!: number;
  public sourceSizeBytes!: number;
  public sourceMimeType!: string;
  public readonly createdAt!: Date;
}

ImageUploadEvent.init(
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
    itemId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    sourceSizeBytes: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    sourceMimeType: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: "image_upload_events",
    modelName: "ImageUploadEvent",
    timestamps: true,
    updatedAt: false,
    indexes: [
      { name: "image_upload_events_user_id", fields: ["userId"] },
    ],
  }
);

export default ImageUploadEvent;
