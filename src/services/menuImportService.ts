import Papa from "papaparse";
import { ApiError } from "../utils/ApiError";
import { Menu as MenuM } from "../models/Menu";
import { Category as CategoryM } from "../models/Category";
import { Item as ItemM } from "../models/Item";

type CsvType = "category" | "item";

interface CsvRow {
  type: CsvType | "";
  categoryTitle?: string;
  categoryActive?: string;
  categoryPosition?: string;
  itemTitle?: string;
  itemDescription?: string;
  itemPrice?: string;
  itemActive?: string;
  itemPosition?: string;
}

interface ParsedRow {
  rowNumber: number;
  type: CsvType;
  categoryTitle?: string;
  categoryActive?: boolean;
  categoryPosition?: number;
  itemTitle?: string;
  itemDescription?: string;
  itemPrice?: number;
  itemActive?: boolean;
  itemPosition?: number;
}

export interface MenuImportSummary {
  createdCategories: number;
  reusedCategories: number;
  createdItems: number;
  errors: { row: number; message: string }[];
}

const POSITION_GAP = 10000;

const CSV_ALLOWED_MIME = new Set(["text/csv", "application/csv", "text/plain", "application/vnd.ms-excel"]);

function normalizeTitle(value?: string | null) {
  return (value ?? "").trim();
}

function parseBoolean(value: string | undefined, defaultValue: boolean) {
  if (value === undefined || value === null || value === "") return defaultValue;
  const normalized = value.toString().trim().toLowerCase();
  if (["1", "true", "yes", "si", "sí"].includes(normalized)) return true;
  if (["0", "false", "no"].includes(normalized)) return false;
  return defaultValue;
}

function parseNumber(value: string | undefined) {
  if (value === undefined || value === null || value === "") return undefined;
  const num = Number(value);
  if (!Number.isFinite(num)) return undefined;
  return num;
}

function ensureCsvFile(file?: Express.Multer.File) {
  if (!file) {
    throw new ApiError("Subí un archivo CSV en el campo 'file'.", 400);
  }
  const mimetype = (file.mimetype || "").toLowerCase();
  if (!CSV_ALLOWED_MIME.has(mimetype)) {
    throw new ApiError("Formato inválido. Solo se aceptan archivos CSV.", 400, { mimetype });
  }
}

function parseCsv(file: Express.Multer.File): ParsedRow[] {
  const text = file.buffer.toString("utf-8");
  const parsed = Papa.parse<CsvRow>(text, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.errors.length) {
    const first = parsed.errors[0];
    throw new ApiError("No se pudo leer el CSV.", 400, {
      message: first.message,
      row: first.row,
    });
  }

  return parsed.data.map((row, index) => {
      const rawType = (row.type ?? "").trim().toLowerCase();
      if (rawType !== "category" && rawType !== "item") {
        throw new ApiError("La columna 'type' solo puede ser 'category' o 'item'.", 400, {
          row: index + 2,
          value: row.type ?? "",
        });
      }

      const parsedRow: ParsedRow = {
        rowNumber: index + 2, // 1-based + header
        type: rawType,
      };

      if (rawType === "category") {
        parsedRow.categoryTitle = normalizeTitle(row.categoryTitle);
        parsedRow.categoryActive = parseBoolean(row.categoryActive, true);
        parsedRow.categoryPosition = parseNumber(row.categoryPosition);
      } else {
        parsedRow.itemTitle = normalizeTitle(row.itemTitle);
        parsedRow.itemDescription = row.itemDescription ?? "";
        parsedRow.itemPrice = parseNumber(row.itemPrice);
        parsedRow.itemActive = parseBoolean(row.itemActive, true);
        parsedRow.itemPosition = parseNumber(row.itemPosition);
      }
      return parsedRow;
    });
}

function normalizeKey(value: string) {
  return value.trim().toLowerCase();
}

async function ensureMenuForUser(userId: number, menuId: number) {
  const menu = await MenuM.findOne({ where: { id: menuId, userId, active: true } });
  if (!menu) {
    throw new ApiError("Menú no encontrado o sin permisos.", 404, { menuId });
  }
  return menu;
}

async function resolveNextCategoryPosition(menuId: number, cache: Map<number, number>) {
  if (!cache.has(menuId)) {
    const max = await CategoryM.max("position", { where: { menuId } });
    const start = Number.isFinite(max as number) ? (max as number) + POSITION_GAP : POSITION_GAP;
    cache.set(menuId, start);
  } else {
    cache.set(menuId, cache.get(menuId)! + POSITION_GAP);
  }
  return cache.get(menuId)!;
}

async function resolveNextItemPosition(categoryId: number, cache: Map<number, number>) {
  if (!cache.has(categoryId)) {
    const max = await ItemM.max("position", { where: { categoryId } });
    const start = Number.isFinite(max as number) ? (max as number) + POSITION_GAP : POSITION_GAP;
    cache.set(categoryId, start);
  } else {
    cache.set(categoryId, cache.get(categoryId)! + POSITION_GAP);
  }
  return cache.get(categoryId)!;
}

export async function importMenuFromCsv(
  userId: number,
  menuId: number,
  file?: Express.Multer.File
): Promise<MenuImportSummary> {
  ensureCsvFile(file);
  await ensureMenuForUser(userId, menuId);

  const rows = parseCsv(file!);
  if (!rows.length) {
    throw new ApiError("El CSV está vacío.", 400);
  }

  const summary: MenuImportSummary = {
    createdCategories: 0,
    reusedCategories: 0,
    createdItems: 0,
    errors: [],
  };

  const existingCategories = await CategoryM.findAll({ where: { menuId } });
  const existingByKey = new Map<string, CategoryM>();
  existingCategories.forEach((cat) => {
    existingByKey.set(normalizeKey(cat.title), cat);
  });

  const createdCategories = new Map<string, CategoryM>();

  const categoryPositionCache = new Map<number, number>();
  const itemPositionCache = new Map<number, number>();

  let lastCategory: CategoryM | undefined;

  for (const row of rows) {
    if (row.type === "category") {
      if (!row.categoryTitle) {
        summary.errors.push({
          row: row.rowNumber,
          message: "La categoría debe tener un título.",
        });
        lastCategory = undefined;
        continue;
      }

      const key = normalizeKey(row.categoryTitle);

      if (createdCategories.has(key)) {
        lastCategory = createdCategories.get(key);
        summary.reusedCategories += 1;
        continue;
      }

      if (existingByKey.has(key)) {
        lastCategory = existingByKey.get(key);
        summary.reusedCategories += 1;
        continue;
      }

      const position =
        typeof row.categoryPosition === "number"
          ? Math.max(0, Math.floor(row.categoryPosition))
          : await resolveNextCategoryPosition(menuId, categoryPositionCache);

      const category = await CategoryM.create({
        menuId,
        title: row.categoryTitle,
        active: row.categoryActive ?? true,
        position,
      });

      createdCategories.set(key, category);
      lastCategory = category;
      summary.createdCategories += 1;
      continue;
    }

    if (!lastCategory) {
      summary.errors.push({
        row: row.rowNumber,
        message: "Definí una categoría antes de declarar ítems.",
      });
      continue;
    }

    if (!row.itemTitle) {
      summary.errors.push({
        row: row.rowNumber,
        message: "El ítem debe tener un título.",
      });
      continue;
    }

    const position =
      typeof row.itemPosition === "number"
        ? Math.max(0, Math.floor(row.itemPosition))
        : await resolveNextItemPosition(lastCategory.id, itemPositionCache);

    await ItemM.create({
      categoryId: lastCategory.id,
      title: row.itemTitle,
      description: row.itemDescription ?? null,
      price: row.itemPrice ?? null,
      active: row.itemActive ?? true,
      position,
    } as any);

    summary.createdItems += 1;
  }

  return summary;
}
