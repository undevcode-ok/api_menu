import multer from 'multer';
import { Request } from 'express';

/**
 * Tipos MIME permitidos para imágenes
 */
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
];

/**
 * Extensiones de archivo permitidas
 */
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

/**
 * Tamaño máximo de archivo: 4MB
 */
const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB en bytes

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
      new Error(
        `Tipo de archivo no permitido. Solo se permiten: ${ALLOWED_MIME_TYPES.join(', ')}`
      )
    );
  }

  // Verificar extensión
  const fileExtension = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));
  if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
    return callback(
      new Error(
        `Extensión de archivo no permitida. Solo se permiten: ${ALLOWED_EXTENSIONS.join(', ')}`
      )
    );
  }

  callback(null, true);
};

/**
 * Configuración de Multer para uploads de imágenes
 * - Storage: Memory (archivos en RAM como Buffer)
 * - Límite: 10MB por archivo
 * - Filtro: Solo imágenes
 */
export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
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
  allowedTypes: string[] = ALLOWED_MIME_TYPES
) {
  const customFileFilter = (
    req: Request,
    file: Express.Multer.File,
    callback: multer.FileFilterCallback
  ) => {
    if (!allowedTypes.includes(file.mimetype)) {
      return callback(
        new Error(
          `Tipo de archivo no permitido. Solo se permiten: ${allowedTypes.join(', ')}`
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
