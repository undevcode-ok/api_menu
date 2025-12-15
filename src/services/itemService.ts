import { Op, Transaction } from "sequelize";
import sequelize from "../utils/databaseService";

import {
  Item as ItemM,
  ItemAttributes,
  ItemCreationAttributes,
} from "../models/Item";
import { Category as CategoryM } from "../models/Category";
import { Menu as MenuM } from "../models/Menu";
import ItemImage from "../models/ItemImage";
import { URL } from "url";
import { ImageS3Service } from "../s3-image-module";

import { CreateItemDto, UpdateItemDto } from "../dtos/item.dto";
import { ApiError } from "../utils/ApiError";

/* ===========================
 * Helper genérico de TX
 * =========================== */
async function withTx<T>(fn: (t: Transaction) => Promise<T>) {
  return sequelize.transaction(fn);
}

/* ===========================
 * Helpers de tenant
 * =========================== */

/**
 * Verifica que la categoría pertenezca a un menú del usuario (tenant).
 * Si no es así, tira 403.
 */
async function assertCategoryBelongsToUser(categoryId: number, userId: number) {
  const category = await CategoryM.findOne({
    where: { id: categoryId, active: true },
    include: [
      {
        model: MenuM,
        as: "menu",
        where: { userId, active: true },
      },
    ],
  });

  if (!category) {
    throw new ApiError("No tenés permiso para usar esta categoría", 403);
  }
}

const POSITION_GAP = 10000;

const sanitizePosition = (value: number) => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
};

async function nextPositionForCategory(categoryId: number, t?: Transaction) {
  const maxPosition = await ItemM.max("position", {
    where: { categoryId },
    transaction: t,
  });
  if (!Number.isFinite(maxPosition as number)) return POSITION_GAP;
  return (maxPosition as number) + POSITION_GAP;
}

async function findCategoryNeighbors(
  categoryId: number,
  target: number,
  excludeId?: number,
  t?: Transaction
) {
  const whereBase: any = { categoryId };
  if (excludeId) whereBase.id = { [Op.ne]: excludeId };

  const lock = t ? Transaction.LOCK.UPDATE : undefined;

  const [previous, next] = await Promise.all([
    ItemM.findOne({
      where: { ...whereBase, position: { [Op.lt]: target } },
      order: [["position", "DESC"]],
      transaction: t,
      lock,
    }),
    ItemM.findOne({
      where: { ...whereBase, position: { [Op.gt]: target } },
      order: [["position", "ASC"]],
      transaction: t,
      lock,
    }),
  ]);

  return { previous, next };
}

function computePositionBetween(
  previous?: ItemM | null,
  next?: ItemM | null
) {
  const prevPosition = previous?.position ?? 0;
  const nextPosition = next?.position ?? prevPosition + POSITION_GAP * 2;
  const gap = nextPosition - prevPosition;
  if (gap <= 1) return null;
  return prevPosition + Math.floor(gap / 2);
}

async function rebalanceCategoryPositions(categoryId: number, t?: Transaction) {
  const lock = t ? Transaction.LOCK.UPDATE : undefined;
  const items = await ItemM.findAll({
    where: { categoryId },
    order: [["position", "ASC"]],
    transaction: t,
    lock,
  });

  let nextPosition = POSITION_GAP;
  for (const item of items) {
    if (item.position !== nextPosition) {
      await item.update({ position: nextPosition }, { transaction: t });
    }
    nextPosition += POSITION_GAP;
  }
}

async function resolveItemPositionWithGaps(
  categoryId: number,
  requested: number,
  itemId?: number,
  t?: Transaction
) {
  const target = sanitizePosition(requested);
  const { previous, next } = await findCategoryNeighbors(
    categoryId,
    target,
    itemId,
    t
  );
  let finalPosition = computePositionBetween(previous, next);

  if (finalPosition === null) {
    await rebalanceCategoryPositions(categoryId, t);
    const retry = await findCategoryNeighbors(categoryId, target, itemId, t);
    finalPosition = computePositionBetween(retry.previous, retry.next);
  }

  return finalPosition ?? POSITION_GAP;
}

/**
 * Busca un ítem por ID asegurando que pertenezca al usuario (tenant),
 * navegando Item -> Category -> Menu.userId.
 */
async function findItemForUser(
  userId: number,
  itemId: number,
  options: { activeOnly?: boolean } = {}
) {
  if (!itemId) throw new ApiError("ID de ítem inválido", 400);

  const { activeOnly = true } = options;
  const where: any = { id: itemId };
  if (activeOnly) where.active = true;

  const menuWhere: any = { userId };
  if (activeOnly) menuWhere.active = true;

  const item = await ItemM.findOne({
    where,
    include: [
      {
        model: CategoryM,
        as: "category",
        include: [
          {
            model: MenuM,
            as: "menu",
            where: menuWhere,
          },
        ],
      },
      {
        model: ItemImage,
        as: "images",
        separate: true,
        order: [["sortOrder", "ASC"]],
      },
    ],
  });

  if (!item) {
    throw new ApiError("Ítem no encontrado", 404);
  }

  return item;
}

function formatItemResponse(item: ItemM) {
  const plain = item.get({ plain: true }) as any;
  delete plain.category;
  return plain;
}

function extractS3Key(imageUrl?: string | null) {
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
  const key = extractS3Key(imageUrl);
  if (!key) return;
  await ImageS3Service.deleteImage(key);
}

async function deleteItemImagesFromS3(images?: ItemImage[]) {
  if (!Array.isArray(images)) return;
  for (const image of images) {
    await deleteImageFromS3(image?.url);
  }
}

/* ===========================
 * CRUD con tenant
 * =========================== */

export const getAllItems = async (userId: number) => {
  try {
    const items = await ItemM.findAll({
      where: { active: true },
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
        {
          model: ItemImage,
          as: "images",
          separate: true,
          order: [["sortOrder", "ASC"]],
        },
      ],
      order: [["position", "ASC"]],
    });

    return items.map(formatItemResponse);
  } catch (e: any) {
    throw new ApiError("Error al obtener ítems", 500, undefined, e);
  }
};

export const getItemById = async (userId: number, id: number) => {
  const item = await findItemForUser(userId, id);
  return formatItemResponse(item);
};

export const createItem = async (userId: number, data: CreateItemDto) => {
  if (!data.categoryId || !data.title) {
    throw new ApiError("Datos incompletos para crear ítem", 400);
  }

  // 🛡 chequeamos que la categoría cuelgue de un menú del usuario actual
  await assertCategoryBelongsToUser(data.categoryId, userId);

  try {
    return await withTx(async (t) => {
      const position = await nextPositionForCategory(data.categoryId, t);
      const created = await ItemM.create(
        { ...(data as ItemCreationAttributes), position },
        { transaction: t }
      );
      return formatItemResponse(created);
    });
  } catch (e: any) {
    throw new ApiError("Error al crear ítem", 500, undefined, e);
  }
};

export const updateItem = async (
  userId: number,
  id: number,
  data: UpdateItemDto
) => {
  if (!userId) throw new ApiError("ID de usuario (tenant) inválido", 400);
  if (!id) throw new ApiError("ID de ítem inválido", 400);

  try {
    // 🛡 Buscamos el item SIN filtrar por active, pero validando tenant por la cadena Item -> Category -> Menu -> User
    const item = await ItemM.findOne({
      where: { id },
      include: [
        {
          model: CategoryM,
          as: "category",
          include: [
            {
              model: MenuM,
              as: "menu",
              where: { userId },
            },
          ],
        },
      ],
    });

    if (!item) {
      throw new ApiError("Item not found", 404, { userId, id });
    }

    if (
      typeof data.categoryId === "number" &&
      data.categoryId !== item.categoryId
    ) {
      throw new ApiError(
        "No se puede mover el ítem a otra categoría",
        400,
        { currentCategoryId: item.categoryId, requestedCategoryId: data.categoryId }
      );
    }

    await withTx(async (t) => {
      const patch: Partial<ItemAttributes> = {};

      if (typeof data.title === "string") {
        patch.title = data.title;
      }

      if (Object.prototype.hasOwnProperty.call(data, "description")) {
        patch.description = (data.description ?? null) as any;
      }

      if (Object.prototype.hasOwnProperty.call(data, "price")) {
        patch.price = (data.price ?? null) as any;
      }

      if (typeof data.active === "boolean") {
        patch.active = data.active;
      }

      if (typeof data.newPosition === "number") {
        patch.position = await resolveItemPositionWithGaps(
          item.categoryId,
          data.newPosition,
          item.id,
          t
        );
      }

      if (Object.keys(patch).length === 0) return;
      await item.update(patch, { transaction: t });
    });

    await item.reload();
    return formatItemResponse(item);
  } catch (e: any) {
    if (e instanceof ApiError) throw e;
    throw new ApiError("Error al actualizar ítem", 500, undefined, e);
  }
};

export const deleteItem = async (userId: number, id: number) => {
  const item = await findItemForUser(userId, id, { activeOnly: false });

  try {
    await deleteItemImagesFromS3(((item as any).images ?? []) as ItemImage[]);
    await withTx(async (t) => {
      // si querés borrar también las imágenes relacionadas:
      await ItemImage.destroy({ where: { itemId: item.id }, transaction: t });
      await item.destroy({ transaction: t });
    });
  } catch (e: any) {
    throw new ApiError("Error al eliminar ítem", 500, undefined, e);
  }
};
