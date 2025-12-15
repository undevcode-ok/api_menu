import { Request, Response, NextFunction } from "express";
import { URL } from "url";
import * as menuService from "../services/menuService";
import { ApiError } from "../utils/ApiError";
import { QrFormat, requestQr } from "../services/qrService";
import { importMenuFromCsv } from "../services/menuImportService";

/* ===========================
 * Controladores
 * =========================== */

const ALLOWED_QR_FORMATS: QrFormat[] = ["png", "svg", "webp"];
const QR_FORMAT_SET = new Set(ALLOWED_QR_FORMATS);
const DEFAULT_QR_SIZE = 512;
const MIN_QR_SIZE = 128;
const MAX_QR_SIZE = 1024;
const RAW_PUBLIC_MENU_BASE = (process.env.PUBLIC_MENU_BASE_URL ?? "").trim();

function buildMenuPublicUrl(req: Request, menuId: number) {
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

  url.searchParams.set("id", menuId.toString());

  return url.toString();
}

export const getAllMenus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const menus = await menuService.getAllMenus(req.tenant!.id);
    res.json(menus);
  } catch (e) {
    next(e);
  }
};

export const getMenuById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const menu = await menuService.getMenuById(req.tenant!.id, Number(req.params.id));
    res.json(menu);
  } catch (e) {
    next(e);
  }
};

export const createMenu = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.tenant!.id;
    const files = (req.files ?? []) as Express.Multer.File[];

    // 💡 req.body YA viene validado y normalizado por Zod (createMenuSchema)
    const data = req.body as any;

    const created = await menuService.createMenu(userId, data, files);
    res.status(201).json(created);
  } catch (e) {
    next(e);
  }
};

export const updateMenu = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.tenant!.id;
    const files = (req.files ?? []) as Express.Multer.File[];

    // 💡 req.body YA viene validado y normalizado por Zod (updateMenuSchema)
    const data = req.body as any;

    const updated = await menuService.updateMenu(
      userId,
      Number(req.params.id),
      data,
      files
    );

    res.json(updated);
  } catch (e) {
    next(e);
  }
};

export const deleteMenu = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await menuService.deleteMenu(req.tenant!.id, Number(req.params.id));
    res.status(204).send();
  } catch (e) {
    next(e);
  }
};

export const getMenuQr = async (req: Request, res: Response, next: NextFunction) => {
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

    const targetUrl = buildMenuPublicUrl(req, menu.id);
    const qrResponse = await requestQr({ data: targetUrl, format, size });

    if (qrResponse.kind === "binary") {
      res.setHeader("Content-Type", qrResponse.contentType);
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("Content-Disposition", `inline; filename="menu-${menu.id}-qr.${format}"`);
      return res.send(qrResponse.buffer);
    }

    return res.json({
      targetUrl,
      providerResponse: qrResponse.payload,
    });
  } catch (e) {
    next(e);
  }
};

export const importMenuCsv = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.tenant!.id;
    const menuId = Number(req.params.id);
    const file = req.file as Express.Multer.File | undefined;
    const summary = await importMenuFromCsv(userId, menuId, file);
    res.status(201).json(summary);
  } catch (e) {
    next(e);
  }
};

export const getPublicMenu = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const menuId = Number(req.params.id);
    const menu = await menuService.getPublicMenuById(menuId);
    res.json(menu);
  } catch (e) {
    next(e);
  }
};
