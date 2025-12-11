// Minimal helper to convert an external URL into an S3/CDN URL using the existing S3 module.
import { ImageS3Service } from "../s3-image-module";

/**
 * Subís una imagen desde una URL externa a S3 (con resize/conversión del módulo)
 * y devolvés la URL final (S3/CDN) para guardarla en el mismo campo `url`.
 */
export async function toS3UrlFromExternal(url: string, folder: string): Promise<string> {
  const up = await ImageS3Service.uploadFromUrl(url, folder, { maxWidth: 1600, maxHeight: 1600 });
  return up.url;
}
