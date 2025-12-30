import {
  Category as CategoryM,
  CategoryAttributes,
  CategoryCreationAttributes,
} from "../models/Category";
import { Menu as MenuM } from "../models/Menu";
import { Item as ItemM } from "../models/Item";
import ItemImage from "../models/ItemImage";
import { Op, Transaction } from "sequelize";
import sequelize from "../utils/databaseService";
import { URL } from "url";
import { ImageS3Service } from "../s3-image-module";
import { CreateCategoryDto, UpdateCategoryDto } from "../dtos/category.dto";
import { ApiError } from "../utils/ApiError";

/* ===========================
 * Helpers de tenant
 * =========================== */

/**
 * Verifica que el menú pertenezca al usuario (tenant).
 * Tira 403 si el menú no existe o no es del usuario.
 */
async function assertMenuBelongsToUser(menuId: number, userId: number) {
  const menu = await MenuM.findOne({
    where: {
      id: menuId,
      userId,
      active: true,
    },
  });

  if (!menu) {
    throw new ApiError("No tenés permiso para usar este menú", 403);
  }
}

const POSITION_GAP = 10000;

const sanitizePosition = (value: number) => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
};

async function nextPositionForMenu(menuId: number, t?: Transaction) {
  const maxPosition = await CategoryM.max("position", {
    where: { menuId },
    transaction: t,
  });
  if (!Number.isFinite(maxPosition as number)) return POSITION_GAP;
  return (maxPosition as number) + POSITION_GAP;
}

async function findMenuNeighbors(
  menuId: number,
  target: number,
  excludeId?: number,
  t?: Transaction
) {
  const whereBase: any = { menuId };
  if (excludeId) whereBase.id = { [Op.ne]: excludeId };

  const lock = t ? Transaction.LOCK.UPDATE : undefined;

  const [previous, next] = await Promise.all([
    CategoryM.findOne({
      where: { ...whereBase, position: { [Op.lt]: target } },
      order: [["position", "DESC"]],
      transaction: t,
      lock,
    }),
    CategoryM.findOne({
      where: { ...whereBase, position: { [Op.gt]: target } },
      order: [["position", "ASC"]],
      transaction: t,
      lock,
    }),
  ]);

  return { previous, next };
}

function computePositionBetween(
  previous?: CategoryM | null,
  next?: CategoryM | null
) {
  const prevPosition = previous?.position ?? 0;
  const nextPosition = next?.position ?? prevPosition + POSITION_GAP * 2;
  const gap = nextPosition - prevPosition;
  if (gap <= 1) return null;
  return prevPosition + Math.floor(gap / 2);
}

async function rebalanceMenuPositions(menuId: number, t?: Transaction) {
  const lock = t ? Transaction.LOCK.UPDATE : undefined;
  const categories = await CategoryM.findAll({
    where: { menuId },
    order: [["position", "ASC"]],
    transaction: t,
    lock,
  });

  let nextPosition = POSITION_GAP;
  for (const category of categories) {
    if (category.position !== nextPosition) {
      await category.update({ position: nextPosition }, { transaction: t });
    }
    nextPosition += POSITION_GAP;
  }
}

async function resolvePositionWithGaps(
  menuId: number,
  requested: number,
  categoryId: number,
  t?: Transaction
) {
  const target = sanitizePosition(requested);
  const { previous, next } = await findMenuNeighbors(
    menuId,
    target,
    categoryId,
    t
  );
  let finalPosition = computePositionBetween(previous, next);

  if (finalPosition === null) {
    await rebalanceMenuPositions(menuId, t);
    const retry = await findMenuNeighbors(menuId, target, categoryId, t);
    finalPosition = computePositionBetween(retry.previous, retry.next);
  }

  return finalPosition ?? POSITION_GAP;
}

interface FindCategoryOptions {
  includeItems?: boolean;
  activeOnly?: boolean;
}

function buildItemsInclude() {
  return {
    model: ItemM,
    as: "items",
    required: false,
    order: [["position", "ASC"]],
    include: [
      {
        model: ItemImage,
        as: "images",
        required: false,
      },
    ],
  };
}

async function findCategoryForUser(
  userId: number,
  id: number,
  options: FindCategoryOptions = {}
) {
  const { includeItems = false, activeOnly = false } = options;
  const include: any[] = [
    {
      model: MenuM,
      as: "menu",
      where: { userId },
      attributes: [],
    },
  ];

  if (includeItems) {
    include.push(buildItemsInclude());
  }

  const where: any = { id };
  if (activeOnly) where.active = true;

  const category = await CategoryM.findOne({
    where,
    include,
  });

  if (!category) {
    throw new ApiError("Categoría no encontrada", 404);
  }

  return category;
}

function formatCategoryResponse(category: CategoryM) {
  const plain = category.get({ plain: true }) as any;
  delete plain.menu;
  delete plain.items;
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

async function deleteItemImages(
  item: ItemM & { images?: ItemImage[] },
  t?: Transaction
) {
  if (!Array.isArray(item.images)) return;
  for (const image of item.images) {
    await deleteImageFromS3(image?.url);
    await image.destroy({ transaction: t });
  }
}

async function deleteItemsForCategory(
  category: CategoryM & { items?: ItemM[] },
  t?: Transaction
) {
  if (!Array.isArray(category.items)) return;
  for (const item of category.items) {
    await deleteItemImages(item as any, t);
    await item.destroy({ transaction: t });
  }
}

/* ===========================
 * CRUD base con tenant
 * =========================== */

export const getAllCategories = async (userId: number) => {
  try {
    const categories = await CategoryM.findAll({
      where: { active: true },
      include: [
        {
          model: MenuM,
          as: "menu",
          where: { userId },
          attributes: [],
        },
      ],
      order: [["position", "ASC"]],
    });
    return categories.map(formatCategoryResponse);
  } catch (e: any) {
    throw new ApiError("Error al obtener categorías", 500, undefined, e);
  }
};

export const getCategoryById = async (userId: number, id: number) => {
  if (!id) throw new ApiError("ID de categoría inválido", 400);

  const category = await findCategoryForUser(userId, id, { activeOnly: true });
  return formatCategoryResponse(category);
};

export const createCategory = async (userId: number, data: CreateCategoryDto) => {
  if (!data.title || !data.menuId) {
    throw new ApiError("Datos incompletos para crear categoría", 400);
  }

  // 🛡 aseguramos que el menú sea del usuario actual
  await assertMenuBelongsToUser(data.menuId, userId);

  try {
    const created = await sequelize.transaction(async (t) => {
      const position = await nextPositionForMenu(data.menuId, t);
      return CategoryM.create(
        { ...(data as CategoryCreationAttributes), position },
        { transaction: t }
      );
    });
    return formatCategoryResponse(created);
  } catch (e: any) {
    throw new ApiError("Error al crear categoría", 500, undefined, e);
  }
};

export const updateCategory = async (
  userId: number,
  id: number,
  data: UpdateCategoryDto
) => {
  try {
    const category = await findCategoryForUser(userId, id, { activeOnly: false });

    await sequelize.transaction(async (t) => {
      const patch: Partial<CategoryAttributes> = {};

      if (typeof data.title === "string") patch.title = data.title;
      if (typeof data.active === "boolean") patch.active = data.active;
      if (typeof data.newPosition === "number") {
        patch.position = await resolvePositionWithGaps(
          category.menuId,
          data.newPosition,
          category.id,
          t
        );
      }

      if (Object.keys(patch).length === 0) return;
      await category.update(patch, { transaction: t });
    });

    return formatCategoryResponse(category);
  } catch (e: any) {
    throw new ApiError("Error al actualizar categoría", 500, undefined, e);
  }
};

export const deleteCategory = async (userId: number, id: number) => {
  const category = await findCategoryForUser(userId, id, {
    includeItems: true,
  });
  try {
    await sequelize.transaction(async (t) => {
      await deleteItemsForCategory(category as any, t);
      await category.destroy({ transaction: t });
    });
  } catch (e: any) {
    throw new ApiError("Error al eliminar categoría", 500, undefined, e);
  }
};
