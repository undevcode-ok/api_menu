/**
 * Ejemplo completo de integración del módulo S3
 *
 * Este archivo muestra cómo integrar el módulo en tu aplicación Express
 */

import express, { Request, Response } from 'express';
import { Sequelize } from 'sequelize';
import {
  ImageS3Service,
  uploadMiddleware,
  handleMulterError,
  Image,
  initImageModel
} from './index';

// ============================================
// 1. CONFIGURACIÓN INICIAL
// ============================================

const app = express();
app.use(express.json());

// Configurar Sequelize (ejemplo con MySQL)
const sequelize = new Sequelize(
  process.env.DB_NAME || 'database',
  process.env.DB_USER || 'user',
  process.env.DB_PASSWORD || 'password',
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'mysql',
    logging: false
  }
);

// Inicializar modelo Image
initImageModel(sequelize);

// Sincronizar base de datos
sequelize.sync({ alter: true }).then(() => {
  console.log('✅ Base de datos sincronizada');
});

// ============================================
// 2. RUTAS DE EJEMPLO
// ============================================

/**
 * POST /api/images/upload
 * Subir una única imagen
 */
app.post(
  '/api/images/upload',
  uploadMiddleware.single('image'),
  handleMulterError,
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: 'No se proporcionó ninguna imagen'
        });
      }

      // Subir a S3
      const result = await ImageS3Service.uploadImage(
        req.file,
        'uploads', // carpeta en S3
        {
          quality: 80,
          maxWidth: 1920,
          maxHeight: 1080
        }
      );

      // Guardar en base de datos
      const image = await Image.create({
        key: result.key,
        url: result.url,
        originalName: result.originalName,
        size: result.size,
        mimeType: result.mimeType,
        folder: 'uploads'
      });

      res.json({
        success: true,
        image: {
          id: image.id,
          url: image.url,
          originalName: image.originalName,
          size: image.size
        }
      });
    } catch (error: any) {
      console.error('Error al subir imagen:', error);
      res.status(500).json({
        error: 'Error al subir la imagen',
        message: error.message
      });
    }
  }
);

/**
 * POST /api/images/upload-multiple
 * Subir múltiples imágenes
 */
app.post(
  '/api/images/upload-multiple',
  uploadMiddleware.array('images', 10), // máximo 10 imágenes
  handleMulterError,
  async (req: Request, res: Response) => {
    try {
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        return res.status(400).json({
          error: 'No se proporcionaron imágenes'
        });
      }

      const uploadedImages = [];

      // Subir todas las imágenes
      for (const file of files) {
        const result = await ImageS3Service.uploadImage(
          file,
          'gallery',
          { quality: 85 }
        );

        const image = await Image.create({
          key: result.key,
          url: result.url,
          originalName: result.originalName,
          size: result.size,
          mimeType: result.mimeType,
          folder: 'gallery'
        });

        uploadedImages.push(image);
      }

      res.json({
        success: true,
        count: uploadedImages.length,
        images: uploadedImages
      });
    } catch (error: any) {
      console.error('Error al subir imágenes:', error);
      res.status(500).json({
        error: 'Error al subir las imágenes',
        message: error.message
      });
    }
  }
);

/**
 * POST /api/images/from-url
 * Descargar imagen desde URL y subirla a S3
 */
app.post('/api/images/from-url', async (req: Request, res: Response) => {
  try {
    const { url, folder = 'downloads' } = req.body;

    if (!url) {
      return res.status(400).json({
        error: 'Se requiere el parámetro "url"'
      });
    }

    // Descargar y subir
    const result = await ImageS3Service.uploadFromUrl(url, folder);

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
    console.error('Error al descargar imagen:', error);
    res.status(500).json({
      error: 'Error al descargar y subir la imagen',
      message: error.message
    });
  }
});

/**
 * GET /api/images
 * Listar todas las imágenes
 */
app.get('/api/images', async (req: Request, res: Response) => {
  try {
    const { folder } = req.query;

    const where = folder ? { folder: folder as string } : {};

    const images = await Image.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      count: images.length,
      images
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Error al obtener imágenes',
      message: error.message
    });
  }
});

/**
 * GET /api/images/:id
 * Obtener una imagen por ID
 */
app.get('/api/images/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const image = await Image.findByPk(id);

    if (!image) {
      return res.status(404).json({
        error: 'Imagen no encontrada'
      });
    }

    res.json({
      success: true,
      image
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Error al obtener la imagen',
      message: error.message
    });
  }
});

/**
 * DELETE /api/images/:id
 * Eliminar una imagen
 */
app.delete('/api/images/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const image = await Image.findByPk(id);

    if (!image) {
      return res.status(404).json({
        error: 'Imagen no encontrada'
      });
    }

    // Eliminar de S3
    const deleted = await ImageS3Service.deleteImage(image.key);

    if (!deleted) {
      return res.status(500).json({
        error: 'Error al eliminar la imagen de S3'
      });
    }

    // Eliminar de base de datos
    await image.destroy();

    res.json({
      success: true,
      message: 'Imagen eliminada correctamente'
    });
  } catch (error: any) {
    console.error('Error al eliminar imagen:', error);
    res.status(500).json({
      error: 'Error al eliminar la imagen',
      message: error.message
    });
  }
});

/**
 * DELETE /api/images/folder/:folder
 * Eliminar todas las imágenes de una carpeta
 */
app.delete('/api/images/folder/:folder', async (req: Request, res: Response) => {
  try {
    const { folder } = req.params;

    // Buscar todas las imágenes de la carpeta
    const images = await Image.findAll({ where: { folder } });

    if (images.length === 0) {
      return res.status(404).json({
        error: 'No se encontraron imágenes en esta carpeta'
      });
    }

    // Extraer las keys
    const keys = images.map(img => img.key);

    // Eliminar de S3
    const deletedCount = await ImageS3Service.deleteMultipleImages(keys);

    // Eliminar de base de datos
    await Image.destroy({ where: { folder } });

    res.json({
      success: true,
      message: `${deletedCount} imágenes eliminadas correctamente`,
      deletedFromS3: deletedCount,
      deletedFromDB: images.length
    });
  } catch (error: any) {
    console.error('Error al eliminar carpeta:', error);
    res.status(500).json({
      error: 'Error al eliminar las imágenes',
      message: error.message
    });
  }
});

// ============================================
// 3. INICIAR SERVIDOR
// ============================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`📸 Rutas de imágenes disponibles:`);
  console.log(`   POST   /api/images/upload`);
  console.log(`   POST   /api/images/upload-multiple`);
  console.log(`   POST   /api/images/from-url`);
  console.log(`   GET    /api/images`);
  console.log(`   GET    /api/images/:id`);
  console.log(`   DELETE /api/images/:id`);
  console.log(`   DELETE /api/images/folder/:folder`);
});

export default app;
