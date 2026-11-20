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
  imagePolicy: {
    lifetimeUploadLimit: number | null;
    uploadsUsed: number | null;
    uploadsRemaining: number | null;
    maxFileSizeBytes: number;
    allowedMimeTypes: readonly string[];
    allowedExtensions: readonly string[];
    scope: "items" | "all";
    acceptsExternalUrls: boolean;
    deletionRestoresQuota: false;
  };
}

export interface ImageMutationRequest {
  scope: "items" | "menus";
  fileUploads: number;
  urlMutations: number;
  currentUploads: number;
}

export const FREE_ROLE_NAME = "Free";
export const ADMIN_ROLE_NAME = "Admin";
export const CLIENT_ROLE_NAME = "Client";
export const FREE_MENU_LIMIT = 1;
export const STANDARD_MENU_LIMIT = 3;
export const FREE_CATEGORIES_PER_MENU_LIMIT = 3;
export const FREE_ITEMS_PER_MENU_LIMIT = 20;
export const FREE_IMAGE_UPLOAD_LIMIT = 20;
export const IMAGE_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
export const IMAGE_MAX_FILES_PER_REQUEST = 20;
export const IMAGE_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
] as const;
export const IMAGE_ALLOWED_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
] as const;

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

function imagePolicyForPlan(plan: AccountPlan, imageUploadsUsed: number) {
  if (plan === "free") {
    const used = Math.max(0, imageUploadsUsed);
    return {
      lifetimeUploadLimit: FREE_IMAGE_UPLOAD_LIMIT,
      uploadsUsed: used,
      uploadsRemaining: Math.max(0, FREE_IMAGE_UPLOAD_LIMIT - used),
      maxFileSizeBytes: IMAGE_MAX_FILE_SIZE_BYTES,
      allowedMimeTypes: IMAGE_ALLOWED_MIME_TYPES,
      allowedExtensions: IMAGE_ALLOWED_EXTENSIONS,
      scope: "items" as const,
      acceptsExternalUrls: false,
      deletionRestoresQuota: false as const,
    };
  }

  return {
    lifetimeUploadLimit: null,
    uploadsUsed: null,
    uploadsRemaining: null,
    maxFileSizeBytes: IMAGE_MAX_FILE_SIZE_BYTES,
    allowedMimeTypes: IMAGE_ALLOWED_MIME_TYPES,
    allowedExtensions: IMAGE_ALLOWED_EXTENSIONS,
    scope: "all" as const,
    acceptsExternalUrls: true,
    deletionRestoresQuota: false as const,
  };
}

export function entitlementsForPlan(
  plan: AccountPlan,
  imageUploadsUsed = 0
): AccountEntitlements {
  if (plan === "free") {
    return {
      plan,
      limits: {
        menus: FREE_MENU_LIMIT,
        categoriesPerMenu: FREE_CATEGORIES_PER_MENU_LIMIT,
        itemsPerMenu: FREE_ITEMS_PER_MENU_LIMIT,
        images: true,
      },
      imagePolicy: imagePolicyForPlan(plan, imageUploadsUsed),
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
    imagePolicy: imagePolicyForPlan(plan, imageUploadsUsed),
  };
}

export function entitlementsForRoleName(
  roleName?: string | null,
  imageUploadsUsed = 0
): AccountEntitlements {
  const plan = planFromRoleName(roleName);
  if (plan === "free" || isClientRoleName(roleName)) {
    return entitlementsForPlan(plan, imageUploadsUsed);
  }

  return {
    plan: "standard",
    limits: {
      menus: null,
      categoriesPerMenu: null,
      itemsPerMenu: null,
      images: true,
    },
    imagePolicy: imagePolicyForPlan("standard", imageUploadsUsed),
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
    existingCategories + requestedCategories <= FREE_CATEGORIES_PER_MENU_LIMIT
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
  mutation: ImageMutationRequest
) {
  if (plan !== "free") return;

  const { scope, fileUploads, urlMutations, currentUploads } = mutation;
  const hasImageMutation = fileUploads > 0 || urlMutations > 0;
  if (!hasImageMutation) return;

  if (scope !== "items") {
    throw new ApiError(
      "El plan Free permite imágenes únicamente en platos.",
      403,
      {
        code: "FREE_PLAN_IMAGE_SCOPE_RESTRICTED",
        plan,
        allowedScope: "items",
      }
    );
  }

  if (urlMutations > 0) {
    throw new ApiError(
      "El plan Free permite subir archivos de imagen, pero no vincular URLs externas.",
      403,
      {
        code: "FREE_PLAN_IMAGE_URL_NOT_ALLOWED",
        plan,
        acceptsExternalUrls: false,
      }
    );
  }

  if (currentUploads + fileUploads <= FREE_IMAGE_UPLOAD_LIMIT) return;

  throw new ApiError(
    `El plan Free permite hasta ${FREE_IMAGE_UPLOAD_LIMIT} cargas de imágenes en total. Borrar una imagen no recupera el cupo.`,
    403,
    {
      code: "FREE_PLAN_IMAGE_UPLOAD_LIMIT",
      plan,
      limit: FREE_IMAGE_UPLOAD_LIMIT,
      current: currentUploads,
      requested: fileUploads,
      remaining: Math.max(0, FREE_IMAGE_UPLOAD_LIMIT - currentUploads),
      deletionRestoresQuota: false,
    }
  );
}
