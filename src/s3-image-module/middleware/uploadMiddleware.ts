import multer from 'multer';
import { Request } from 'express';
import { ApiError } from '../../utils/ApiError';
import {
  IMAGE_ALLOWED_EXTENSIONS,
  IMAGE_ALLOWED_MIME_TYPES,
  IMAGE_MAX_FILE_SIZE_BYTES,
  IMAGE_MAX_FILES_PER_REQUEST,
} from '../../policies/accountPolicy';

/**
 * Tipos MIME permitidos para imágenes
 */
const ALLOWED_MIME_TYPES: readonly string[] = IMAGE_ALLOWED_MIME_TYPES;

/**
 * Extensiones de archivo permitidas
 */
const ALLOWED_EXTENSIONS: readonly string[] = IMAGE_ALLOWED_EXTENSIONS;

/**
 * Tamaño máximo por archivo: 5MB
 */
export const MAX_FILE_SIZE = IMAGE_MAX_FILE_SIZE_BYTES;

/**
 * Filtra archivos para permitir solo imágenes
 */
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  callback: multer.FileFilterCallback
) => {
  // Verificar tipo MIME
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return callback(
      new ApiError(
        `Tipo de archivo no permitido. Solo se permiten: ${ALLOWED_MIME_TYPES.join(', ')}`,
        400,
        {
          code: 'IMAGE_FILE_TYPE_NOT_ALLOWED',
          allowedMimeTypes: ALLOWED_MIME_TYPES,
        }
      )
    );
  }

  // Verificar extensión
  const fileExtension = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));
  if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
    return callback(
      new ApiError(
        `Extensión de archivo no permitida. Solo se permiten: ${ALLOWED_EXTENSIONS.join(', ')}`,
        400,
        {
          code: 'IMAGE_FILE_EXTENSION_NOT_ALLOWED',
          allowedExtensions: ALLOWED_EXTENSIONS,
        }
      )
    );
  }

  callback(null, true);
};

/**
 * Configuración de Multer para uploads de imágenes
 * - Storage: Memory (archivos en RAM como Buffer)
 * - Límite: 5MB por archivo y hasta 20 archivos por solicitud
 * - Filtro: Solo imágenes
 */
export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: IMAGE_MAX_FILES_PER_REQUEST,
    fields: 50,
    parts: 80,
  },
  fileFilter,
});

/**
 * Middleware para manejar errores de Multer
 */
export const handleMulterError = (
  error: any,
  req: Request,
  res: any,
  next: any
) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'El archivo es demasiado grande',
        message: `El tamaño máximo permitido es ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
      });
    }

    return res.status(400).json({
      error: 'Error al subir archivo',
      message: error.message,
    });
  }

  if (error) {
    return res.status(400).json({
      error: 'Error al procesar el archivo',
      message: error.message,
    });
  }

  next();
};

/**
 * Configuración personalizada de Multer
 * Permite especificar límites y filtros personalizados
 *
 * @param maxSize - Tamaño máximo en bytes (opcional)
 * @param allowedTypes - Tipos MIME permitidos (opcional)
 * @returns Instancia de multer configurada
 */
export function createUploadMiddleware(
  maxSize: number = MAX_FILE_SIZE,
  allowedTypes: readonly string[] = ALLOWED_MIME_TYPES
) {
  const customFileFilter = (
    req: Request,
    file: Express.Multer.File,
    callback: multer.FileFilterCallback
  ) => {
    if (!allowedTypes.includes(file.mimetype)) {
      return callback(
        new ApiError(
          `Tipo de archivo no permitido. Solo se permiten: ${allowedTypes.join(', ')}`,
          400,
          {
            code: 'IMAGE_FILE_TYPE_NOT_ALLOWED',
            allowedMimeTypes: allowedTypes,
          }
        )
      );
    }
    callback(null, true);
  };

  return multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: maxSize,
    },
    fileFilter: customFileFilter,
  });
}
