/**
 * Módulo S3 para Gestión de Imágenes
 *
 * Exporta todos los componentes necesarios para trabajar con imágenes en S3
 *
 * @example
 * ```typescript
 * import { ImageS3Service, uploadMiddleware, Image } from './s3-image-module';
 * ```
 */

// Servicio principal
export { ImageS3Service } from './services/ImageS3Service';

// Middleware de Multer
export {
  uploadMiddleware,
  handleMulterError,
  createUploadMiddleware
} from './middleware/uploadMiddleware';

// Modelo de base de datos
export { Image, initImageModel } from './models/Image.model';
export type { ImageAttributes, ImageCreationAttributes } from './models/Image.model';

// Configuración de S3
export { getS3Client, getBucketName, getS3Config } from './config/s3Config';

// Utilidades de procesamiento de imágenes
export {
  convertToWebP,
  getImageMetadata,
  isValidImage,
  resizeImage
} from './utils/imageProcessor';

// Tipos
export type {
  UploadImageResult,
  ImageProcessOptions,
  S3Config,
  UploadedFile
} from './types';
