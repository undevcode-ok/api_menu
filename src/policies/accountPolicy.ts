import { ApiError } from "../utils/ApiError";

export type AccountPlan = "free" | "standard";

export interface AccountEntitlements {
  plan: AccountPlan;
  limits: {
    menus: number | null;
    categoriesPerMenu: number | null;
    itemsPerMenu: number | null;
    images: boolean;
  };
}

export const FREE_ROLE_NAME = "Free";
export const ADMIN_ROLE_NAME = "Admin";
export const CLIENT_ROLE_NAME = "Client";
export const FREE_MENU_LIMIT = 1;
export const STANDARD_MENU_LIMIT = 3;
export const FREE_CATEGORIES_PER_MENU_LIMIT = 3;
export const FREE_ITEMS_PER_MENU_LIMIT = 10;

export function planFromRoleName(roleName?: string | null): AccountPlan {
  return roleName?.trim().toLowerCase() === FREE_ROLE_NAME.toLowerCase()
    ? "free"
    : "standard";
}

export function isAdminRoleName(roleName?: string | null) {
  return roleName?.trim().toLowerCase() === ADMIN_ROLE_NAME.toLowerCase();
}

export function isClientRoleName(roleName?: string | null) {
  return roleName?.trim().toLowerCase() === CLIENT_ROLE_NAME.toLowerCase();
}

export function entitlementsForPlan(plan: AccountPlan): AccountEntitlements {
  if (plan === "free") {
    return {
      plan,
      limits: {
        menus: FREE_MENU_LIMIT,
        categoriesPerMenu: FREE_CATEGORIES_PER_MENU_LIMIT,
        itemsPerMenu: FREE_ITEMS_PER_MENU_LIMIT,
        images: false,
      },
    };
  }

  return {
    plan,
    limits: {
      menus: STANDARD_MENU_LIMIT,
      categoriesPerMenu: null,
      itemsPerMenu: null,
      images: true,
    },
  };
}

export function entitlementsForRoleName(
  roleName?: string | null
): AccountEntitlements {
  const plan = planFromRoleName(roleName);
  if (plan === "free" || isClientRoleName(roleName)) {
    return entitlementsForPlan(plan);
  }

  return {
    plan: "standard",
    limits: {
      menus: null,
      categoriesPerMenu: null,
      itemsPerMenu: null,
      images: true,
    },
  };
}

export function assertMenuCreationWithinPlan(
  plan: AccountPlan,
  existingMenus: number
) {
  const limit = plan === "free" ? FREE_MENU_LIMIT : STANDARD_MENU_LIMIT;
  if (existingMenus < limit) return;

  throw new ApiError(
    plan === "free"
      ? "El plan Free permite crear un solo menú activo."
      : `El plan estándar permite hasta ${STANDARD_MENU_LIMIT} menús activos.`,
    403,
    {
      code:
        plan === "free"
          ? "FREE_PLAN_MENU_LIMIT"
          : "STANDARD_PLAN_MENU_LIMIT",
      plan,
      limit,
      current: existingMenus,
    }
  );
}

export function assertCategoryCreationWithinPlan(
  plan: AccountPlan,
  existingCategories: number,
  requestedCategories = 1
) {
  if (
    plan !== "free" ||
    existingCategories + requestedCategories <=
      FREE_CATEGORIES_PER_MENU_LIMIT
  ) {
    return;
  }

  throw new ApiError(
    `El plan Free permite hasta ${FREE_CATEGORIES_PER_MENU_LIMIT} categorías por menú.`,
    403,
    {
      code: "FREE_PLAN_CATEGORY_LIMIT",
      plan,
      limit: FREE_CATEGORIES_PER_MENU_LIMIT,
      current: existingCategories,
      requested: requestedCategories,
    }
  );
}

export function assertItemCreationWithinPlan(
  plan: AccountPlan,
  existingItems: number,
  requestedItems = 1
) {
  if (
    plan !== "free" ||
    existingItems + requestedItems <= FREE_ITEMS_PER_MENU_LIMIT
  ) {
    return;
  }

  throw new ApiError(
    `El plan Free permite hasta ${FREE_ITEMS_PER_MENU_LIMIT} ítems por menú.`,
    403,
    {
      code: "FREE_PLAN_ITEM_LIMIT",
      plan,
      limit: FREE_ITEMS_PER_MENU_LIMIT,
      current: existingItems,
      requested: requestedItems,
    }
  );
}

export function assertImageMutationWithinPlan(
  plan: AccountPlan,
  hasImageMutation: boolean
) {
  if (plan !== "free" || !hasImageMutation) return;

  throw new ApiError(
    "El plan Free no permite cargar ni vincular imágenes.",
    403,
    {
      code: "FREE_PLAN_IMAGES_DISABLED",
      plan,
      images: false,
    }
  );
}
