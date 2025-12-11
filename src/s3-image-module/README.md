# Módulo S3 para Gestión de Imágenes

Módulo completo y reutilizable para subir, procesar y gestionar imágenes en AWS S3 con conversión automática a formato WebP.

## 🚀 Características

- ✅ **Conversión automática a WebP** - Optimiza todas las imágenes al formato más eficiente
- ✅ **Compresión inteligente** - Reduce el tamaño sin perder calidad visual
- ✅ **Upload desde archivo o URL** - Sube imágenes desde el frontend o descarga desde URLs externas
- ✅ **Integración con Express y Multer** - Middleware listo para usar
- ✅ **Modelo Sequelize incluido** - Guarda URLs y metadata en base de datos
- ✅ **TypeScript completo** - Tipado estricto y autocompletado
- ✅ **Gestión de errores robusta** - Validaciones y mensajes claros

## 📦 Instalación

### 1. Copiar el módulo a tu proyecto

```bash
cp -r s3-image-module /tu-proyecto/
```

### 2. Instalar dependencias

Las siguientes dependencias deben estar instaladas en tu proyecto:

```bash
npm install @aws-sdk/client-s3 sharp multer axios uuid
npm install -D @types/multer
```

### 3. Configurar variables de entorno

Agrega estas variables a tu archivo `.env`:

```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=tu_access_key_id
AWS_SECRET_ACCESS_KEY=tu_secret_access_key
AWS_BUCKET_NAME=tu-bucket-name
```

### 4. Configurar el bucket S3

Asegúrate de que tu bucket tenga:
- ✅ Permisos de lectura pública habilitados
- ✅ CORS configurado si subes desde el frontend

Ejemplo de configuración CORS:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": []
  }
]
```

## 🔧 Uso

### Configuración inicial en tu proyecto

```typescript
// En tu archivo de inicialización de base de datos
import { initImageModel } from './s3-image-module/models/Image.model';
import { sequelize } from './config/database';

// Inicializar el modelo
const Image = initImageModel(sequelize);

// Sincronizar con la base de datos
await sequelize.sync();
```

### Ejemplo 1: Upload de imagen desde formulario

```typescript
import { Router } from 'express';
import { ImageS3Service } from './s3-image-module/services/ImageS3Service';
import { uploadMiddleware } from './s3-image-module/middleware/uploadMiddleware';
import { Image } from './s3-image-module/models/Image.model';

const router = Router();

router.post(
  '/upload',
  uploadMiddleware.single('image'), // 'image' es el nombre del campo en el form
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No se proporcionó ninguna imagen' });
      }

      // Subir a S3 en la carpeta "productos"
      const result = await ImageS3Service.uploadImage(
        req.file,
        'productos',
        {
          quality: 80,      // Calidad de compresión (1-100)
          maxWidth: 1920,   // Ancho máximo
          maxHeight: 1080   // Alto máximo
        }
      );

      // Guardar en base de datos
      const image = await Image.create({
        key: result.key,
        url: result.url,
        originalName: result.originalName,
        size: result.size,
        mimeType: result.mimeType,
        folder: 'productos'
      });

      res.json({
        success: true,
        image: {
          id: image.id,
          url: image.url,
          key: image.key
        }
      });
    } catch (error: any) {
      res.status(500).json({
        error: 'Error al subir la imagen',
        message: error.message
      });
    }
  }
);

export default router;
```

### Ejemplo 2: Upload de múltiples imágenes

```typescript
router.post(
  '/upload-multiple',
  uploadMiddleware.array('images', 5), // Máximo 5 imágenes
  async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No se proporcionaron imágenes' });
      }

      const uploadedImages = [];

      for (const file of files) {
        const result = await ImageS3Service.uploadImage(file, 'galeria');

        const image = await Image.create({
          key: result.key,
          url: result.url,
          originalName: result.originalName,
          size: result.size,
          mimeType: result.mimeType,
          folder: 'galeria'
        });

        uploadedImages.push(image);
      }

      res.json({
        success: true,
        count: uploadedImages.length,
        images: uploadedImages
      });
    } catch (error: any) {
      res.status(500).json({
        error: 'Error al subir las imágenes',
        message: error.message
      });
    }
  }
);
```

### Ejemplo 3: Upload desde URL

```typescript
router.post('/upload-from-url', async (req, res) => {
  try {
    const { imageUrl, folder = 'downloads' } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: 'Se requiere imageUrl' });
    }

    // Descargar y subir a S3
    const result = await ImageS3Service.uploadFromUrl(imageUrl, folder);

    // Guardar en base de datos
    const image = await Image.create({
      key: result.key,
      url: result.url,
      originalName: result.originalName,
      size: result.size,
      mimeType: result.mimeType,
      folder
    });

    res.json({
      success: true,
      image
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Error al descargar y subir la imagen',
      message: error.message
    });
  }
});
```

### Ejemplo 4: Eliminar imagen

```typescript
router.delete('/images/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar en base de datos
    const image = await Image.findByPk(id);

    if (!image) {
      return res.status(404).json({ error: 'Imagen no encontrada' });
    }

    // Eliminar de S3
    const deleted = await ImageS3Service.deleteImage(image.key);

    if (deleted) {
      // Eliminar de base de datos
      await image.destroy();

      res.json({
        success: true,
        message: 'Imagen eliminada correctamente'
      });
    } else {
      res.status(500).json({
        error: 'Error al eliminar la imagen de S3'
      });
    }
  } catch (error: any) {
    res.status(500).json({
      error: 'Error al eliminar la imagen',
      message: error.message
    });
  }
});
```

### Ejemplo 5: Listar imágenes por carpeta

```typescript
router.get('/images/folder/:folder', async (req, res) => {
  try {
    const { folder } = req.params;

    const images = await Image.findAll({
      where: { folder },
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      count: images.length,
      images
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Error al obtener las imágenes',
      message: error.message
    });
  }
});
```

## 📝 API Reference

### `ImageS3Service`

#### `uploadImage(file, folder, options)`
Sube una imagen a S3, convirtiéndola a WebP.

**Parámetros:**
- `file` (UploadedFile): Archivo de Multer
- `folder` (string): Carpeta destino en S3 (ej: "productos")
- `options` (ImageProcessOptions): Opciones de procesamiento
  - `quality` (number): Calidad de compresión 1-100 (default: 80)
  - `maxWidth` (number): Ancho máximo en píxeles
  - `maxHeight` (number): Alto máximo en píxeles
  - `fit` (string): Estrategia de resize ('inside', 'cover', 'contain')

**Retorna:** `Promise<UploadImageResult>`

#### `uploadFromUrl(imageUrl, folder, options)`
Descarga una imagen desde una URL y la sube a S3.

**Parámetros:**
- `imageUrl` (string): URL de la imagen
- `folder` (string): Carpeta destino
- `options` (ImageProcessOptions): Opciones de procesamiento

**Retorna:** `Promise<UploadImageResult>`

#### `deleteImage(key)`
Elimina una imagen de S3.

**Parámetros:**
- `key` (string): Ruta completa en S3 (ej: "productos/abc123.webp")

**Retorna:** `Promise<boolean>`

#### `imageExists(key)`
Verifica si una imagen existe en S3.

**Parámetros:**
- `key` (string): Ruta completa en S3

**Retorna:** `Promise<boolean>`

#### `getPublicUrl(key)`
Obtiene la URL pública de una imagen.

**Parámetros:**
- `key` (string): Ruta completa en S3

**Retorna:** `string` (URL pública)

#### `deleteMultipleImages(keys)`
Elimina múltiples imágenes de S3.

**Parámetros:**
- `keys` (string[]): Array de rutas en S3

**Retorna:** `Promise<number>` (cantidad eliminada)

### `uploadMiddleware`

Middleware de Multer preconfigurado:

```typescript
// Single file
uploadMiddleware.single('fieldName')

// Multiple files
uploadMiddleware.array('fieldName', maxCount)

// Multiple fields
uploadMiddleware.fields([
  { name: 'avatar', maxCount: 1 },
  { name: 'gallery', maxCount: 5 }
])
```

**Configuración:**
- Storage: Memory (Buffer)
- Límite de tamaño: 10MB
- Tipos permitidos: jpeg, jpg, png, gif, webp

### Modelo `Image`

**Campos:**
```typescript
{
  id: string (UUID)
  key: string              // Ruta en S3
  url: string              // URL pública
  originalName: string     // Nombre original
  size: number             // Bytes
  mimeType: string         // Tipo MIME
  folder?: string          // Carpeta opcional
  createdAt: Date
  updatedAt: Date
}
```

## 🎨 Integración con Frontend

### React con Axios

```typescript
async function uploadImage(file: File) {
  const formData = new FormData();
  formData.append('image', file);

  const response = await axios.post('/api/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    onUploadProgress: (progressEvent) => {
      const progress = (progressEvent.loaded / progressEvent.total!) * 100;
      console.log(`Upload: ${progress}%`);
    }
  });

  return response.data.image;
}
```

### Fetch API

```typescript
async function uploadImage(file: File) {
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData
  });

  const data = await response.json();
  return data.image;
}
```

## 🔒 Seguridad

### Validaciones implementadas

✅ **Tipo de archivo**: Solo acepta imágenes (jpeg, png, gif, webp)
✅ **Tamaño**: Límite de 10MB por archivo
✅ **Validación de imagen**: Verifica que sea una imagen válida con Sharp
✅ **Nombres únicos**: Usa UUID para evitar colisiones

### Recomendaciones adicionales

- Implementa autenticación JWT en las rutas
- Limita el rate limiting por usuario
- Valida dimensiones mínimas/máximas según tu caso de uso
- Implementa políticas de bucket S3 restrictivas

## 🐛 Troubleshooting

### Error: "Faltan variables de entorno de AWS"
**Solución**: Verifica que todas las variables estén en `.env`

### Error: "El archivo es demasiado grande"
**Solución**: Ajusta `MAX_FILE_SIZE` en `uploadMiddleware.ts` o valida el tamaño en el frontend

### Error: "AccessDenied" en S3
**Solución**: Verifica los permisos del bucket y las credenciales IAM

### Las imágenes no son públicas
**Solución**: Configura el bucket con ACL pública o usa políticas de bucket

## 📄 Licencia

Este módulo es código libre y puede ser usado en cualquier proyecto.

---

**Desarrollado con ❤️ para proyectos TypeScript + Express + S3**
