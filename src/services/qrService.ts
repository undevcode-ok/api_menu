import axios from "axios";
import { ApiError } from "../utils/ApiError";

const DEFAULT_QR_ENDPOINT = "https://api-qr-yz35.onrender.com/api/qr";
const QR_API_ENDPOINT = (process.env.QR_API_ENDPOINT ?? DEFAULT_QR_ENDPOINT).trim() || DEFAULT_QR_ENDPOINT;
const QR_API_TIMEOUT_MS = Number(process.env.QR_API_TIMEOUT_MS ?? 10000);

export type QrFormat = "png" | "svg" | "webp";

export interface QrRequestPayload {
  data: string;
  format: QrFormat;
  size: number;
}

export type QrResponse =
  | { kind: "binary"; contentType: string; buffer: Buffer }
  | { kind: "json"; contentType: string; payload: any };

export async function requestQr(payload: QrRequestPayload): Promise<QrResponse> {
  try {
    const response = await axios.post(QR_API_ENDPOINT, payload, {
      headers: { "Content-Type": "application/json" },
      responseType: "arraybuffer",
      timeout: QR_API_TIMEOUT_MS,
    });

    const contentType = (response.headers["content-type"] || "application/octet-stream").toLowerCase();
    const buffer = Buffer.from(response.data);

    if (contentType.includes("application/json")) {
      const jsonText = buffer.toString("utf-8");
      try {
        const parsed = JSON.parse(jsonText);
        return { kind: "json", contentType, payload: parsed };
      } catch (err) {
        throw new ApiError("QR API devolvió una respuesta JSON inválida", 502, undefined, err);
      }
    }

    return { kind: "binary", contentType, buffer };
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const details = {
        status,
        endpoint: QR_API_ENDPOINT,
      };
      const clientError = status && status >= 400 && status < 500;
      throw new ApiError(
        "No se pudo generar el código QR",
        clientError ? 400 : 502,
        details,
        error
      );
    }

    throw new ApiError("Error inesperado generando el código QR", 500, undefined, error);
  }
}
