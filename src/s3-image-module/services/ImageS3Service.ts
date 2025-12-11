import { PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getS3Client, getBucketName } from '../config/s3Config';
import { convertToWebP, isValidImage } from '../utils/imageProcessor';
import { UploadImageResult, ImageProcessOptions, UploadedFile } from '../types';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

/**
 * Servicio para gestionar imágenes en AWS S3
 */
export class ImageS3Service {
  private static s3Client = getS3Client();
  private static bucketName = getBucketName();

  /**
   * Sube una imagen a S3, convirtiéndola a WebP
   *
   * @param file - Archivo subido por Multer
   * @param folder - Carpeta destino en S3 (ej: "productos", "usuarios/avatares")
   * @param options - Opciones de procesamiento de imagen
   * @returns Información de la imagen subida (key, url, etc)
   */
  static async uploadImage(
    file: UploadedFile,
    folder: string = '',
    options: ImageProcessOptions = {}
  ): Promise<UploadImageResult> {
    // Validar que sea una imagen
    const isValid = await isValidImage(file.buffer);
    if (!isValid) {
      throw new Error('El archivo proporcionado no es una imagen válida');
    }

    // Convertir a WebP
    const webpBuffer = await convertToWebP(file.buffer, options);

    // Generar nombre único
    const fileName = `${uuidv4()}.webp`;
    const key = folder ? `${folder}/${fileName}` : fileName;

    // Subir a S3
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: webpBuffer,
      ContentType: 'image/webp',
      ACL: 'public-read', // Hacer la imagen pública
    });

    await this.s3Client.send(command);

    // Construir URL pública
    const url = `https://${this.bucketName}.s3.amazonaws.com/${key}`;

    return {
      key,
      url,
      originalName: file.originalname,
      size: webpBuffer.length,
      mimeType: 'image/webp',
    };
  }

  /**
   * Descarga una imagen desde una URL y la sube a S3
   *
   * @param imageUrl - URL de la imagen a descargar
   * @param folder - Carpeta destino en S3
   * @param options - Opciones de procesamiento
   * @returns Información de la imagen subida
   */
  static async uploadFromUrl(
    imageUrl: string,
    folder: string = '',
    options: ImageProcessOptions = {}
  ): Promise<UploadImageResult> {
    try {
      // Descargar la imagen
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 30000, // 30 segundos timeout
      });

      const buffer = Buffer.from(response.data);

      // Validar que sea una imagen
      const isValid = await isValidImage(buffer);
      if (!isValid) {
        throw new Error('La URL no apunta a una imagen válida');
      }

      // Convertir a WebP
      const webpBuffer = await convertToWebP(buffer, options);

      // Generar nombre único
      const fileName = `${uuidv4()}.webp`;
      const key = folder ? `${folder}/${fileName}` : fileName;

      // Subir a S3
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: webpBuffer,
        ContentType: 'image/webp',
        ACL: 'public-read',
      });

      await this.s3Client.send(command);

      // Construir URL pública
      const url = `https://${this.bucketName}.s3.amazonaws.com/${key}`;

      // Intentar obtener el nombre del archivo de la URL
      const originalName = imageUrl.split('/').pop() || 'downloaded-image';

      return {
        key,
        url,
        originalName,
        size: webpBuffer.length,
        mimeType: 'image/webp',
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Error al descargar la imagen: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Elimina una imagen de S3
   *
   * @param key - Clave/ruta de la imagen en S3
   * @returns true si se eliminó correctamente
   */
  static async deleteImage(key: string): Promise<boolean> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error) {
      console.error('Error al eliminar imagen de S3:', error);
      return false;
    }
  }

  /**
   * Verifica si una imagen existe en S3
   *
   * @param key - Clave/ruta de la imagen en S3
   * @returns true si existe, false si no
   */
  static async imageExists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Obtiene la URL pública de una imagen
   *
   * @param key - Clave/ruta de la imagen en S3
   * @returns URL pública de la imagen
   */
  static getPublicUrl(key: string): string {
    return `https://${this.bucketName}.s3.amazonaws.com/${key}`;
  }

  /**
   * Elimina múltiples imágenes de S3
   *
   * @param keys - Array de claves/rutas de imágenes
   * @returns Número de imágenes eliminadas exitosamente
   */
  static async deleteMultipleImages(keys: string[]): Promise<number> {
    let deletedCount = 0;

    for (const key of keys) {
      const success = await this.deleteImage(key);
      if (success) deletedCount++;
    }

    return deletedCount;
  }
}
