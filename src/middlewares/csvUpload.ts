import multer from "multer";

const CSV_MIME_TYPES = new Set<string>([
  "text/csv",
  "application/csv",
  "text/plain",
  "application/vnd.ms-excel",
]);

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

const storage = multer.memoryStorage();

function csvFileFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  callback: multer.FileFilterCallback
) {
  const mimetype = (file.mimetype || "").toLowerCase();
  if (!CSV_MIME_TYPES.has(mimetype)) {
    return callback(
      new Error("Formato inválido. Subí un archivo CSV (text/csv).")
    );
  }
  callback(null, true);
}

export const csvUpload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: csvFileFilter,
});
