import { ApiError } from "../utils/ApiError";

export type AccountPlan = "free" | "standard";

export interface AccountEntitlements {
  plan: AccountPlan;
  limits: {
    menus: number | null;
    itemsPerMenu: number | null;
    images: boolean;
  };
}

export const FREE_ROLE_NAME = "Free";
export const FREE_MENU_LIMIT = 1;
export const FREE_ITEMS_PER_MENU_LIMIT = 10;

export function planFromRoleName(roleName?: string | null): AccountPlan {
  return roleName?.trim().toLowerCase() === FREE_ROLE_NAME.toLowerCase()
    ? "free"
    : "standard";
}

export function entitlementsForPlan(plan: AccountPlan): AccountEntitlements {
  if (plan === "free") {
    return {
      plan,
      limits: {
        menus: FREE_MENU_LIMIT,
        itemsPerMenu: FREE_ITEMS_PER_MENU_LIMIT,
        images: false,
      },
    };
  }

  return {
    plan,
    limits: {
      menus: null,
      itemsPerMenu: null,
      images: true,
    },
  };
}

export function assertMenuCreationWithinPlan(
  plan: AccountPlan,
  existingMenus: number
) {
  if (plan !== "free" || existingMenus < FREE_MENU_LIMIT) return;

  throw new ApiError(
    "El plan Free permite crear un solo menú.",
    403,
    {
      code: "FREE_PLAN_MENU_LIMIT",
      plan,
      limit: FREE_MENU_LIMIT,
      current: existingMenus,
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
