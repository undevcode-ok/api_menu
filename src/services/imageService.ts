import { Transaction } from "sequelize";
import { URL } from "url";
import { ApiError } from "../utils/ApiError";
import { Image as ImageM, ImageCreationAttributes } from "../models/Image";
import ItemImage from "../models/ItemImage";
import { ImageUploadEvent } from "../models/ImageUploadEvent";
import { Menu as MenuM } from "../models/Menu";
import { Item as ItemM } from "../models/Item";
import { Category as CategoryM } from "../models/Category";
import sequelize from "../utils/databaseService";
import { ImageS3Service } from "../s3-image-module";
import { CreateImageDto, UpdateImageDto } from "../dtos/image.dto";
import {
  assertCanMutateImages,
  getAccountEntitlements,
} from "./accountPolicyService";
import { logger } from "../utils/logger";

type CompletedFileUpload = {
  key: string;
  sourceSizeBytes: number;
  sourceMimeType: string;
};

type ResolvedImage = {
  url: string;
  upload?: CompletedFileUpload;
};

/* ============================================================
   Helpers base
   ============================================================ */

function pickFile(files: Express.Multer.File[] | undefined, field?: string) {
  if (!files || !field) return null;

  const f = files.find((f) => f.fieldname === field) ?? null;
  if (!f) return null;

  // 🛡️ Protege contra archivos vacíos enviados por Postman
  // Si el archivo no tiene tamaño, lo tratamos como que NO existe
  if (!f.size) return null;

  return f;
}

async function resolveImageUrl(
  img: { url?: string; fileField?: string },
  folder: string,
  files?: Express.Multer.File[]
): Promise<ResolvedImage> {
  try {
    const file = pickFile(files, img.fileField);

    if (file) {
      const up = await ImageS3Service.uploadImage(file as any, folder, {
        maxWidth: 1600,
        maxHeight: 1600,
      });

      if (!up?.url) {
        throw new ApiError("Error al subir imagen a S3", 500, {
          fileField: img.fileField ?? null,
        });
      }

      return {
        url: up.url,
        upload: {
          key: up.key,
          sourceSizeBytes: file.size,
          sourceMimeType: file.mimetype,
        },
      };
    }

    // Si no hay archivo pero sí url -> usamos url
    if (img.url) return { url: img.url };

    // ⬇⬇ Validación real: ni file ni url
    throw new ApiError("Debe venir url o fileField", 400, {
      fileField: img.fileField ?? null,
      url: img.url ?? null,
    });
  } catch (err: any) {
    // Si ya es un ApiError nuestro, lo dejamos pasar tal cual
    if (err instanceof ApiError) {
      throw err;
    }

    // Errores desconocidos -> 500 genérico
    throw new ApiError(
      "Error procesando imagen",
      500,
      { fileField: img.fileField ?? null, url: img.url ?? null },
      err
    );
  }
}

function extractS3KeyFromUrl(imageUrl?: string | null) {
  if (!imageUrl) return null;
  try {
    const parsed = new URL(imageUrl);
    const key = parsed.pathname.replace(/^\/+/, "");
    return key || null;
  } catch {
    return null;
  }
}

async function deleteImageFromS3(imageUrl?: string | null) {
  const key = extractS3KeyFromUrl(imageUrl);
  if (!key) return;

  const deleted = await ImageS3Service.deleteImage(key);
  if (!deleted) {
    throw new ApiError("No se pudo eliminar la imagen en S3", 500, { key, imageUrl });
  }
}

function imageBasePatch(img: any) {
  const patch: any = {};
  if (img.alt !== undefined) patch.alt = img.alt;
  if (img.sortOrder !== undefined) patch.sortOrder = img.sortOrder;
  if (img.active !== undefined) patch.active = img.active;
  return patch;
}

async function withTx<T>(fn: (t: Transaction) => Promise<T>) {
  return sequelize.transaction(fn);
}

/* ============================================================
   Helpers de tenant
   ============================================================ */

/** Menú debe ser del usuario actual */
async function assertMenuBelongsToUser(menuId: number, userId: number) {
  const menu = await MenuM.findOne({
    where: { id: menuId, userId, active: true },
  });

  if (!menu) {
    throw new ApiError("No tenés permiso para usar este menú", 403);
  }
}

/** Item debe ser del usuario actual (Item -> Category -> Menu.userId) */
async function assertItemBelongsToUser(
  itemId: number,
  userId: number,
  transaction?: Transaction
) {
  const item = await ItemM.findOne({
    where: { id: itemId, active: true },
    transaction,
    include: [
      {
        model: CategoryM,
        as: "category",
        include: [
          {
            model: MenuM,
            as: "menu",
            where: { userId, active: true },
          },
        ],
      },
    ],
  });

  if (!item) {
    throw new ApiError("Ítem no encontrado", 404);
  }

  return item;
}

/* ============================================================
   A) CRUD genérico → tabla IMAGES (por menú, multi-tenant)
   ============================================================ */

export const getAllImages = async (userId: number) => {
  return await ImageM.findAll({
    where: { active: true },
    include: [
      {
        model: MenuM,
        as: "menu",
        where: { userId, active: true },
      },
    ],
    order: [["id", "ASC"]],
  });
};

export const getImageById = async (
  userId: number,
  id: number,
  options: { includeInactive?: boolean } = {}
) => {
  if (!id) throw new ApiError("ID de imagen inválido", 400);

  const { includeInactive = false } = options;
  const where: any = { id };
  if (!includeInactive) where.active = true;

  const menuWhere: any = { userId };
  if (!includeInactive) menuWhere.active = true;

  const it = await ImageM.findOne({
    where,
    include: [
      {
        model: MenuM,
        as: "menu",
        where: menuWhere,
      },
    ],
  });

  if (!it) throw new ApiError("Imagen no encontrada", 404, { id });

  return it;
};

export const createImage = async (userId: number, data: CreateImageDto) => {
  if (!data.menuId || !data.url) {
    throw new ApiError("Datos incompletos para crear imagen", 400);
  }

  await assertCanMutateImages(userId, {
    scope: "menus",
    fileUploads: 0,
    urlMutations: 1,
  });
  await assertMenuBelongsToUser(data.menuId, userId);

  return await ImageM.create(data as ImageCreationAttributes);
};

export const updateImage = async (
  userId: number,
  id: number,
  data: UpdateImageDto
) => {
  if (!userId) throw new ApiError("ID de usuario (tenant) inválido", 400);
  if (!id) throw new ApiError("ID de imagen inválido", 400);

  await assertCanMutateImages(userId, {
    scope: "menus",
    fileUploads: 0,
    urlMutations: typeof data.url === "string" ? 1 : 0,
  });

  try {
    // 👇 NO filtramos por active
    const img = await ImageM.findOne({
      where: { id },
      include: [
        {
          model: MenuM,
          as: "menu",
          where: { userId }, // validación multi-tenant
        },
      ],
    });

    if (!img) {
      throw new ApiError("Image not found", 404, { userId, id });
    }

    await img.update(data);

    return img;
  } catch (e: any) {
    if (e instanceof ApiError) throw e;
    throw new ApiError("Error al actualizar imagen", 500, undefined, e);
  }
};

export const deleteImage = async (userId: number, id: number) => {
  const it = await getImageById(userId, id, { includeInactive: true });
  await deleteImageFromS3(it.url);
  await it.update({ active: false });
};

/* ============================================================
   B) Funciones específicas para ITEM_IMAGE (S3 / upsert)
   ============================================================ */

export const createItemImage = async (
  itemId: number,
  img: any,
  files?: Express.Multer.File[],
  t?: Transaction
) => {
  const resolved = await resolveImageUrl(img, `items/${itemId}`, files);

  const image = await ItemImage.create(
    {
      itemId,
      url: resolved.url,
      alt: img.alt ?? null,
      sortOrder: img.sortOrder ?? 0,
      active: img.active ?? true,
    },
    { transaction: t }
  );

  return { image, upload: resolved.upload };
};

export const updateItemImage = async (
  itemId: number,
  img: any,
  files?: Express.Multer.File[],
  t?: Transaction
) => {
  if (!img.id) throw new ApiError("ID de imagen requerido", 400);

  const existingImage = await ItemImage.findOne({
    where: { id: img.id, itemId },
    transaction: t,
    ...(t ? { lock: t.LOCK.UPDATE } : {}),
  });
  if (!existingImage) {
    throw new ApiError("Imagen de ítem no encontrada", 404, {
      code: "ITEM_IMAGE_NOT_FOUND",
      itemId,
      imageId: img.id,
    });
  }

  const patch: any = imageBasePatch(img);

  // Si vino nueva imagen (url o file), la subimos
  if (img.url || img.fileField) {
    const resolved = await resolveImageUrl(img, `items/${itemId}`, files);
    patch.url = resolved.url;

    await existingImage.update(patch, { transaction: t });
    return { upload: resolved.upload };
  }

  if (Object.keys(patch).length === 0) return {};

  await existingImage.update(patch, { transaction: t });
  return {};
};

export const deleteItemImage = async (
  itemId: number,
  imgId: number,
  t?: Transaction
) => {
  const image = await ItemImage.findOne({
    where: { id: imgId, itemId },
    transaction: t,
  });

  if (!image) {
    throw new ApiError("Imagen de ítem no encontrada", 404, { itemId, imgId });
  }

  await deleteImageFromS3(image.url);
  await image.destroy({ transaction: t });
};

/* ============================================================
   C) UPSERT para listas de imágenes dentro de un ítem (multi-tenant)
   ============================================================ */

function validateFileReferences(
  images: any[],
  files: Express.Multer.File[] | undefined
) {
  const receivedFiles = files ?? [];
  const filesByField = new Map<string, Express.Multer.File[]>();

  for (const file of receivedFiles) {
    const entries = filesByField.get(file.fieldname) ?? [];
    entries.push(file);
    filesByField.set(file.fieldname, entries);
  }

  const referencedFields = new Set<string>();
  for (const image of images) {
    if (image?._delete === true || !image?.fileField) continue;
    const field = String(image.fileField);
    if (referencedFields.has(field)) {
      throw new ApiError("Un archivo no puede usarse en más de una imagen.", 400, {
        code: "IMAGE_FILE_REFERENCE_DUPLICATED",
        field,
      });
    }

    const matches = filesByField.get(field) ?? [];
    if (matches.length === 0 || !matches[0].size) {
      throw new ApiError("No se recibió el archivo indicado en fileField.", 400, {
        code: "IMAGE_FILE_MISSING",
        field,
      });
    }
    if (matches.length > 1) {
      throw new ApiError("Se recibió más de un archivo para el mismo fileField.", 400, {
        code: "IMAGE_FILE_FIELD_DUPLICATED",
        field,
      });
    }

    referencedFields.add(field);
  }

  const unreferenced = receivedFiles.find(
    (file) => !referencedFields.has(file.fieldname)
  );
  if (unreferenced) {
    throw new ApiError("Se recibió un archivo no referenciado por el payload.", 400, {
      code: "IMAGE_FILE_UNREFERENCED",
      field: unreferenced.fieldname,
    });
  }

  return referencedFields.size;
}

export const upsertItemImages = async (
  userId: number,
  itemId: number,
  images: any[],
  files?: Express.Multer.File[]
) => {
  const fileUploads = validateFileReferences(images, files);
  const urlMutations = images.filter(
    (image) => image?._delete !== true && Boolean(image?.url)
  ).length;
  const uploadedKeys: string[] = [];

  // 🛡 El ítem tiene que ser del usuario actual
  try {
    await withTx(async (t) => {
      await assertItemBelongsToUser(itemId, userId, t);
      const authorization = await assertCanMutateImages(
        userId,
        {
          scope: "items",
          fileUploads,
          urlMutations,
        },
        t
      );

      for (const img of images) {
        if (img._delete) {
          await deleteItemImage(itemId, img.id, t);
          continue;
        }

        const result = img.id
          ? await updateItemImage(itemId, img, files, t)
          : await createItemImage(itemId, img, files, t);

        if (!result.upload) continue;
        uploadedKeys.push(result.upload.key);

        if (authorization.trackUploads) {
          await ImageUploadEvent.create(
            {
              userId,
              itemId,
              sourceSizeBytes: result.upload.sourceSizeBytes,
              sourceMimeType: result.upload.sourceMimeType,
            },
            { transaction: t }
          );
        }
      }
    });
  } catch (error) {
    for (const key of uploadedKeys) {
      await ImageS3Service.deleteImage(key);
    }
    throw error;
  }

  const account = await getAccountEntitlements(userId);
  if (account.plan === "free" && fileUploads > 0) {
    logger.info("Free image upload quota consumed", {
      userId,
      itemId,
      uploadsAdded: fileUploads,
      uploadsUsed: account.imagePolicy.uploadsUsed,
      uploadsRemaining: account.imagePolicy.uploadsRemaining,
    });
  }

  return {
    ok: true,
    account,
  };
};
