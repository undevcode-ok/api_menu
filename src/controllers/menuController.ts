import { Request, Response, NextFunction } from "express";
import { URL } from "url";
import * as menuService from "../services/menuService";
import { ApiError } from "../utils/ApiError";
import { QrFormat, requestQr } from "../services/qrService";
import { importMenuFromCsv } from "../services/menuImportService";
import { RequestLogger } from "../utils/requestLogger";

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : "unknown");

/* ===========================
 * Controladores
 * =========================== */

const ALLOWED_QR_FORMATS: QrFormat[] = ["png", "svg", "webp"];
const QR_FORMAT_SET = new Set(ALLOWED_QR_FORMATS);
const DEFAULT_QR_SIZE = 512;
const MIN_QR_SIZE = 128;
const MAX_QR_SIZE = 1024;
const RAW_PUBLIC_MENU_BASE = (process.env.PUBLIC_MENU_BASE_URL ?? "").trim();

function buildMenuPublicUrl(req: Request, menuPublicId: string) {
  const host = req.get("x-forwarded-host") ?? req.get("host");
  if (!RAW_PUBLIC_MENU_BASE && !host) {
    throw new ApiError(
      "No se pudo resolver el host público para generar el enlace del menú.",
      500
    );
  }

  const proto = req.get("x-forwarded-proto") ?? req.protocol ?? "https";
  const base = RAW_PUBLIC_MENU_BASE || `${proto}://${host}/public/menu`;

  let url: URL;
  try {
    url = new URL(base);
  } catch {
    throw new ApiError("PUBLIC_MENU_BASE_URL debe ser una URL absoluta válida", 500, {
      PUBLIC_MENU_BASE_URL: RAW_PUBLIC_MENU_BASE,
    });
  }

  url.searchParams.set("id", menuPublicId);

  return url.toString();
}

export const getAllMenus = async (req: Request, res: Response, next: NextFunction) => {
  const reqLogger = new RequestLogger(req);
  try {
    reqLogger.info("Listing menus", { tenantId: req.tenant!.id });
    const menus = await menuService.getAllMenus(req.tenant!.id);
    reqLogger.info("Menus listed", { tenantId: req.tenant!.id, count: menus.length });
    res.json(menus);
  } catch (e) {
    reqLogger.error("Failed to list menus", { error: errorMessage(e) });
    next(e);
  }
};

export const getMenuById = async (req: Request, res: Response, next: NextFunction) => {
  const reqLogger = new RequestLogger(req);
  try {
    const menuId = Number(req.params.id);
    reqLogger.info("Fetching menu", { tenantId: req.tenant!.id, menuId });
    const menu = await menuService.getMenuById(req.tenant!.id, menuId);
    reqLogger.info("Menu fetched", { tenantId: req.tenant!.id, menuId });
    res.json(menu);
  } catch (e) {
    reqLogger.error("Failed to fetch menu", {
      tenantId: req.tenant?.id,
      menuId: Number(req.params.id),
      error: errorMessage(e),
    });
    next(e);
  }
};

export const createMenu = async (req: Request, res: Response, next: NextFunction) => {
  const reqLogger = new RequestLogger(req);
  try {
    const userId = req.tenant!.id;
    const files = (req.files ?? []) as Express.Multer.File[];

    // 💡 req.body YA viene validado y normalizado por Zod (createMenuSchema)
    const data = req.body as any;

    reqLogger.info("Creating menu", { tenantId: userId });
    const created = await menuService.createMenu(userId, data, files);
    reqLogger.info("Menu created", { tenantId: userId, menuId: created.id, publicId: created.publicId });
    res.status(201).json(created);
  } catch (e) {
    reqLogger.error("Failed to create menu", {
      tenantId: req.tenant?.id,
      error: errorMessage(e),
    });
    next(e);
  }
};

export const updateMenu = async (req: Request, res: Response, next: NextFunction) => {
  const reqLogger = new RequestLogger(req);
  try {
    const userId = req.tenant!.id;
    const files = (req.files ?? []) as Express.Multer.File[];

    // 💡 req.body YA viene validado y normalizado por Zod (updateMenuSchema)
    const data = req.body as any;
    const menuId = Number(req.params.id);

    reqLogger.info("Updating menu", { tenantId: userId, menuId });
    const updated = await menuService.updateMenu(userId, menuId, data, files);
    reqLogger.info("Menu updated", { tenantId: userId, menuId });

    res.json(updated);
  } catch (e) {
    reqLogger.error("Failed to update menu", {
      tenantId: req.tenant?.id,
      menuId: Number(req.params.id),
      error: errorMessage(e),
    });
    next(e);
  }
};

export const deleteMenu = async (req: Request, res: Response, next: NextFunction) => {
  const reqLogger = new RequestLogger(req);
  try {
    const tenantId = req.tenant!.id;
    const menuId = Number(req.params.id);
    reqLogger.info("Deleting menu", { tenantId, menuId });
    await menuService.deleteMenu(tenantId, menuId);
    reqLogger.info("Menu deleted", { tenantId, menuId });
    res.status(204).send();
  } catch (e) {
    reqLogger.error("Failed to delete menu", {
      tenantId: req.tenant?.id,
      menuId: Number(req.params.id),
      error: errorMessage(e),
    });
    next(e);
  }
};

export const getMenuQr = async (req: Request, res: Response, next: NextFunction) => {
  const reqLogger = new RequestLogger(req);
  try {
    const userId = req.tenant!.id;
    const menuId = Number(req.params.id);

    const menu = await menuService.getMenuBasicInfo(userId, menuId);

    const formatParam = (req.query.format as string | undefined)?.toLowerCase() as QrFormat | undefined;
    const format: QrFormat = formatParam ? formatParam : "png";
    if (formatParam && !QR_FORMAT_SET.has(format)) {
      throw new ApiError(
        `Formato inválido. Permitidos: ${ALLOWED_QR_FORMATS.join(", ")}`,
        400,
        { format: formatParam }
      );
    }

    let size = DEFAULT_QR_SIZE;
    if (typeof req.query.size !== "undefined") {
      const parsed = Number(req.query.size);
      if (!Number.isInteger(parsed) || parsed < MIN_QR_SIZE || parsed > MAX_QR_SIZE) {
        throw new ApiError(
          `El parámetro size debe ser un entero entre ${MIN_QR_SIZE} y ${MAX_QR_SIZE}`,
          400,
          { size: req.query.size }
        );
      }
      size = parsed;
    }

    reqLogger.info("Generating QR for menu", {
      tenantId: userId,
      menuId,
      menuPublicId: menu.publicId,
      format,
      size,
    });

    const targetUrl = buildMenuPublicUrl(req, menu.publicId);
    const qrResponse = await requestQr({ data: targetUrl, format, size });

    if (qrResponse.kind === "binary") {
      reqLogger.info("QR generation succeeded (binary)", {
        menuId,
        format,
        size,
        contentType: qrResponse.contentType,
      });
      res.setHeader("Content-Type", qrResponse.contentType);
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("Content-Disposition", `inline; filename="menu-${menu.id}-qr.${format}"`);
      return res.send(qrResponse.buffer);
    }

    reqLogger.info("QR generation succeeded (json)", {
      menuId,
      format,
      size,
      providerResponseType: qrResponse.kind,
    });

    return res.json({
      targetUrl,
      providerResponse: qrResponse.payload,
    });
  } catch (e) {
    reqLogger.error("Failed to generate QR", {
      menuId: Number(req.params.id),
      error: e instanceof Error ? e.message : "unknown",
    });
    next(e);
  }
};

export const importMenuCsv = async (req: Request, res: Response, next: NextFunction) => {
  const reqLogger = new RequestLogger(req);
  try {
    const userId = req.tenant!.id;
    const menuId = Number(req.params.id);
    const file = req.file as Express.Multer.File | undefined;
    reqLogger.info("Importing menu CSV", { tenantId: userId, menuId, hasFile: Boolean(file) });
    const summary = await importMenuFromCsv(userId, menuId, file);
    reqLogger.info("Menu CSV imported", {
      tenantId: userId,
      menuId,
      createdItems: summary?.createdItems,
      createdCategories: summary?.createdCategories,
      reusedCategories: summary?.reusedCategories,
      errors: summary?.errors?.length ?? 0,
    });
    res.status(201).json(summary);
  } catch (e) {
    reqLogger.error("Failed to import menu CSV", {
      tenantId: req.tenant?.id,
      menuId: Number(req.params.id),
      error: errorMessage(e),
    });
    next(e);
  }
};

export const getPublicMenu = async (req: Request, res: Response, next: NextFunction) => {
  const reqLogger = new RequestLogger(req);
  try {
    const publicId = (req.params.publicId ?? req.params.id ?? "").trim();
    if (!publicId) {
      throw new ApiError("ID de menú inválido", 400);
    }
    reqLogger.info("Fetching public menu", {
      publicId,
    });
    const menu = await menuService.getPublicMenuByPublicId(publicId);
    res.json(menu);
  } catch (e) {
    reqLogger.error("Failed to fetch public menu", {
      publicId: req.params.publicId ?? req.params.id,
      error: e instanceof Error ? e.message : "unknown",
    });
    next(e);
  }
};
