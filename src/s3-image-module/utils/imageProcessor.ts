import sharp from 'sharp';
import { ImageProcessOptions } from '../types';

/**
 * Convierte una imagen a formato WebP optimizado
 *
 * @param buffer - Buffer de la imagen original
 * @param options - Opciones de procesamiento
 * @returns Buffer de la imagen en formato WebP
 */
export async function convertToWebP(
  buffer: Buffer,
  options: ImageProcessOptions = {}
): Promise<Buffer> {
  const {
    quality = 80,
    maxWidth,
    maxHeight,
    fit = 'inside',
  } = options;

  let sharpInstance = sharp(buffer);

  // Aplicar resize si se especificaron dimensiones
  if (maxWidth || maxHeight) {
    sharpInstance = sharpInstance.resize({
      width: maxWidth,
      height: maxHeight,
      fit,
      withoutEnlargement: true, // No agrandar imágenes pequeñas
    });
  }

  // Convertir a WebP con calidad especificada
  const webpBuffer = await sharpInstance
    .webp({ quality })
    .toBuffer();

  return webpBuffer;
}

/**
 * Obtiene los metadatos de una imagen
 *
 * @param buffer - Buffer de la imagen
 * @returns Metadatos de la imagen (width, height, format, size)
 */
export async function getImageMetadata(buffer: Buffer) {
  const metadata = await sharp(buffer).metadata();

  return {
    width: metadata.width,
    height: metadata.height,
    format: metadata.format,
    size: buffer.length,
  };
}

/**
 * Valida que un buffer sea una imagen válida
 *
 * @param buffer - Buffer a validar
 * @returns true si es una imagen válida, false en caso contrario
 */
export async function isValidImage(buffer: Buffer): Promise<boolean> {
  try {
    await sharp(buffer).metadata();
    return true;
  } catch {
    return false;
  }
}

/**
 * Redimensiona una imagen manteniendo el aspect ratio
 *
 * @param buffer - Buffer de la imagen
 * @param maxWidth - Ancho máximo
 * @param maxHeight - Alto máximo
 * @returns Buffer de la imagen redimensionada
 */
export async function resizeImage(
  buffer: Buffer,
  maxWidth?: number,
  maxHeight?: number
): Promise<Buffer> {
  return sharp(buffer)
    .resize({
      width: maxWidth,
      height: maxHeight,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .toBuffer();
}
