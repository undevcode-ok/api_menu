import { S3Client } from '@aws-sdk/client-s3';
import { S3Config } from '../types';

/**
 * Valida que todas las variables de entorno de AWS estén configuradas
 */
function validateS3Config(): S3Config {
  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const bucketName = process.env.AWS_BUCKET_NAME;

  if (!region || !accessKeyId || !secretAccessKey || !bucketName) {
    throw new Error(
      'Faltan variables de entorno de AWS. Requeridas: AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_BUCKET_NAME'
    );
  }

  return {
    region,
    accessKeyId,
    secretAccessKey,
    bucketName,
  };
}

/**
 * Crea y configura el cliente S3
 */
function createS3Client(): S3Client {
  const config = validateS3Config();

  return new S3Client({
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

// Singleton del cliente S3
let s3ClientInstance: S3Client | null = null;

/**
 * Obtiene la instancia del cliente S3 (patrón singleton)
 */
export function getS3Client(): S3Client {
  if (!s3ClientInstance) {
    s3ClientInstance = createS3Client();
  }
  return s3ClientInstance;
}

/**
 * Obtiene el nombre del bucket configurado
 */
export function getBucketName(): string {
  const bucketName = process.env.AWS_BUCKET_NAME;
  if (!bucketName) {
    throw new Error('AWS_BUCKET_NAME no está configurado');
  }
  return bucketName;
}

/**
 * Obtiene la configuración completa de S3
 */
export function getS3Config(): S3Config {
  return validateS3Config();
}
