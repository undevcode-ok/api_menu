import { DataTypes, Model, Optional } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';

/**
 * Atributos del modelo Image
 */
export interface ImageAttributes {
  id: string;
  key: string;           // Ruta completa en S3 (ej: "productos/abc123.webp")
  url: string;           // URL pública de la imagen
  originalName: string;  // Nombre original del archivo
  size: number;          // Tamaño en bytes
  mimeType: string;      // Tipo MIME (generalmente image/webp)
  folder?: string;       // Carpeta/categoría opcional (ej: "productos", "usuarios")
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Atributos opcionales al crear una imagen (id se genera automáticamente)
 */
export interface ImageCreationAttributes extends Optional<ImageAttributes, 'id'> {}

/**
 * Modelo Sequelize para Image
 */
export class Image extends Model<ImageAttributes, ImageCreationAttributes> implements ImageAttributes {
  public id!: string;
  public key!: string;
  public url!: string;
  public originalName!: string;
  public size!: number;
  public mimeType!: string;
  public folder?: string;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

/**
 * Inicializa el modelo Image con Sequelize
 *
 * @param sequelize - Instancia de Sequelize
 * @returns Modelo Image inicializado
 *
 * @example
 * ```typescript
 * import { Sequelize } from 'sequelize';
 * import { initImageModel } from './models/Image.model';
 *
 * const sequelize = new Sequelize('database', 'username', 'password', {
 *   host: 'localhost',
 *   dialect: 'mysql'
 * });
 *
 * const ImageModel = initImageModel(sequelize);
 * ```
 */
export function initImageModel(sequelize: any) {
  Image.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: () => uuidv4(),
        primaryKey: true,
        allowNull: false,
      },
      key: {
        type: DataTypes.STRING(500),
        allowNull: false,
        unique: true,
        comment: 'Ruta completa del archivo en S3',
      },
      url: {
        type: DataTypes.STRING(1000),
        allowNull: false,
        comment: 'URL pública de acceso a la imagen',
      },
      originalName: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Nombre original del archivo subido',
      },
      size: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Tamaño del archivo en bytes',
      },
      mimeType: {
        type: DataTypes.STRING(100),
        allowNull: false,
        defaultValue: 'image/webp',
        comment: 'Tipo MIME de la imagen',
      },
      folder: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Carpeta o categoría de la imagen (ej: productos, usuarios)',
      },
    },
    {
      sequelize,
      tableName: 'images',
      timestamps: true,
      indexes: [
        {
          name: 'idx_image_key',
          fields: ['key'],
        },
        {
          name: 'idx_image_folder',
          fields: ['folder'],
        },
      ],
    }
  );

  return Image;
}

/**
 * Ejemplo de uso con asociaciones
 *
 * Si quieres relacionar imágenes con otros modelos:
 *
 * @example
 * ```typescript
 * // En tu archivo de asociaciones:
 * export function setupImageAssociations(models: any) {
 *   // Ejemplo: Un producto tiene muchas imágenes
 *   models.Product.hasMany(models.Image, {
 *     foreignKey: 'productId',
 *     as: 'images'
 *   });
 *
 *   models.Image.belongsTo(models.Product, {
 *     foreignKey: 'productId',
 *     as: 'product'
 *   });
 * }
 * ```
 */
