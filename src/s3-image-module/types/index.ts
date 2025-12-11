/**
 * Tipos TypeScript para el módulo S3 de imágenes
 */

/**
 * Resultado de la subida de una imagen a S3
 */
export interface UploadImageResult {
  key: string;           // Ruta completa en S3 (ej: "productos/abc123.webp")
  url: string;           // URL pública de la imagen
  originalName: string;  // Nombre original del archivo
  size: number;          // Tamaño en bytes
  mimeType: string;      // Tipo MIME (siempre image/webp)
}

/**
 * Opciones para el procesamiento de imágenes
 */
export interface ImageProcessOptions {
  quality?: number;      // Calidad de compresión (1-100, default: 80)
  maxWidth?: number;     // Ancho máximo en píxeles
  maxHeight?: number;    // Alto máximo en píxeles
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside'; // Estrategia de resize
}

/**
 * Configuración del cliente S3
 */
export interface S3Config {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
}

/**
 * Archivo de Multer extendido con información adicional
 */
export interface UploadedFile extends Express.Multer.File {
  buffer: Buffer;
}
