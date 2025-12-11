import { Transaction } from "sequelize";
import { Menu as MenuM, MenuCreationAttributes } from "../models/Menu";
import { CreateMenuDto, UpdateMenuDto } from "../dtos/menu.dto";
import { ApiError } from "../utils/ApiError";
import sequelize from "../utils/databaseService";
import { ImageS3Service } from "../s3-image-module";

import { Category } from "../models/Category";
import { Item } from "../models/Item";
import ItemImage from "../models/ItemImage";

const DEFAULT_MENU_LOGO_URL = (process.env.DEFAULT_MENU_LOGO_URL ?? "").trim() || null;

/* ===========================
 * Helpers comunes
 * =========================== */

function pickFile(files: Express.Multer.File[] | undefined, field?: string) {
  if (!files || !field) return null;
  return files.find((f) => f.fieldname === field) ?? null;
}

async function resolveMenuImage(
  files: Express.Multer.File[] | undefined,
  fieldName: string,
  folder: string
): Promise<string | null> {
  try {
    const file = pickFile(files, fieldName);
    if (!file) return null;

    const up = await ImageS3Service.uploadImage(file as any, folder, {
      maxWidth: 1600,
      maxHeight: 1600,
    });

    if (!up?.url) {
      throw new ApiError(
        "Error al subir imagen a S3",
        500,
        { fieldName, folder }
      );
    }

    return up.url;
  } catch (err: any) {
    // Mensaje genérico al cliente; contexto va en `details`, error real en `cause`
    throw new ApiError(
      "Error procesando imagen de menú",
      500,
      { fieldName, folder },
      err
    );
  }
}

/* ===========================
 * CRUD con subida a S3
 * =========================== */

/** Obtener todos los menús activos del tenant */
export const getAllMenus = async (userId: number) => {
  if (!userId) {
    throw new ApiError("ID de usuario (tenant) inválido", 400);
  }

  try {
    return await MenuM.findAll({
      where: { active: true, userId },
      order: [["id", "ASC"]],
    });
  } catch (err: any) {
    throw new ApiError("Error al obtener menús", 500, { userId }, err);
  }
};

export const getMenuBasicInfo = async (userId: number, id: number) => {
  if (!userId) throw new ApiError("ID de usuario (tenant) inválido", 400);
  if (!id) throw new ApiError("ID de menú inválido", 400);

  try {
    const menu = await MenuM.findOne({
      where: { id, userId },
    });

    if (!menu) {
      throw new ApiError("Menu not found", 404, { userId, id });
    }

    return menu;
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    throw new ApiError("Error al obtener el menú", 500, { userId, id }, err);
  }
};

/** Obtener un menú con toda su jerarquía */
export const getMenuById = async (
  userId: number,
  id: number,
  t?: Transaction
) => {
  if (!userId) throw new ApiError("ID de usuario (tenant) inválido", 400);
  if (!id) throw new ApiError("ID de menú inválido", 400);

  try {
    const menu = await MenuM.findOne({
      where: { id, userId },
      include: [
        {
          model: Category,
          as: "categories",
          required: false,
          include: [
            {
              model: Item,
              as: "items",
              required: false,
              include: [
                {
                  model: ItemImage,
                  as: "images",
                  required: false,
                  separate: true,
                  order: [
                    ["sortOrder", "ASC"],
                    ["id", "ASC"],
                  ],
                },
              ],
              order: [["position", "ASC"]],
            },
          ],
          order: [["position", "ASC"]],
        },
      ],
      transaction: t,
      order: [
        [{ model: Category, as: "categories" }, "position", "ASC"],
        [
          { model: Category, as: "categories" },
          { model: Item, as: "items" },
          "position",
          "ASC",
        ],
      ],
    });

    if (!menu) {
      throw new ApiError("Menu not found", 404, { userId, id });
    }

    return menu;
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    throw new ApiError("Error al obtener el menú", 500, { userId, id }, err);
  }
};

/** Crear menú (con logo y background opcionales) */
export const createMenu = async (
  userId: number,
  data: CreateMenuDto,
  files?: Express.Multer.File[]
) => {
  if (!userId) throw new ApiError("ID de usuario (tenant) inválido", 400);
  if (!data?.title) {
    throw new ApiError("El título del menú es obligatorio", 400);
  }

  try {
    return await sequelize.transaction(async (t: Transaction) => {
      // Crear menú base
      const menu = await MenuM.create(
        {
          ...(data as MenuCreationAttributes),
          userId,
          active: data.active ?? true,
        },
        { transaction: t }
      );

      // Subir archivos si vinieron
      const logoUrl = await resolveMenuImage(files, "logo", `menus/${menu.id}`);
      const bgUrl = await resolveMenuImage(
        files,
        "backgroundImage",
        `menus/${menu.id}`
      );

      const fallbackLogo = logoUrl ?? DEFAULT_MENU_LOGO_URL;

      if (fallbackLogo || bgUrl) {
        await menu.update(
          {
            ...(fallbackLogo ? { logo: fallbackLogo } : {}),
            ...(bgUrl ? { backgroundImage: bgUrl } : {}),
          },
          { transaction: t }
        );
      }

      return menu;
    });
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    // No mandamos el body en details, solo contexto mínimo
    throw new ApiError(
      "Error al crear el menú",
      500,
      { userId },
      err
    );
  }
};

/** Actualizar menú existente */
export const updateMenu = async (
  userId: number,
  id: number,
  data: UpdateMenuDto,
  files?: Express.Multer.File[]
) => {
  if (!userId) throw new ApiError("ID de usuario (tenant) inválido", 400);
  if (!id) throw new ApiError("ID de menú inválido", 400);

  try {
    return await sequelize.transaction(async (t: Transaction) => {
      const menu = await MenuM.findOne({ where: { id, userId }, transaction: t });
      if (!menu) {
        throw new ApiError("Menu not found", 404, { userId, id });
      }

      const patch: any = {};
      if (typeof data.title === "string") patch.title = data.title;
      if (typeof data.active === "boolean") patch.active = data.active;
      if (typeof data.pos === "string" || data.pos === null) patch.pos = data.pos;
      if (typeof data.color !== "undefined") patch.color = data.color;

      // Subir imágenes nuevas (si las mandan)
      const logoUrl = await resolveMenuImage(files, "logo", `menus/${menu.id}`);
      const bgUrl = await resolveMenuImage(
        files,
        "backgroundImage",
        `menus/${menu.id}`
      );

      if (logoUrl) patch.logo = logoUrl;
      if (bgUrl) patch.backgroundImage = bgUrl;

      if (Object.keys(patch).length > 0) {
        await menu.update(patch, { transaction: t });
      }

      return menu;
    });
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(
      "Error al actualizar el menú",
      500,
      { userId, id },
      err
    );
  }
};

/** Baja lógica */
export const deleteMenu = async (userId: number, id: number) => {
  if (!userId) throw new ApiError("ID de usuario (tenant) inválido", 400);
  if (!id) throw new ApiError("ID de menú inválido", 400);

  try {
    const menu = await MenuM.findOne({ where: { id, userId } });
    if (!menu) {
      throw new ApiError("Menu not found", 404, { userId, id });
    }
    await menu.update({ active: false });
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(
      "Error al eliminar (baja lógica) el menú",
      500,
      { userId, id },
      err
    );
  }
};
