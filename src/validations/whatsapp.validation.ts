import { z } from "zod";

// Accept formatting, but require an international number. Never guess a country.
export const whatsappPhoneSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (!/^\+?[\d\s().-]+$/.test(trimmed)) return trimmed;
    return trimmed.replace(/\D/g, "");
  },
  z.string().regex(/^[1-9]\d{7,14}$/, "Ingresá el WhatsApp con código de país (ej.: +54 9 11 1234 5678)").nullable().optional()
);

export const whatsappOrderSchema = z.object({
  items: z.array(z.object({
    itemId: z.number().int().positive(),
    quantity: z.number().int().min(1).max(99),
  }).strict()).min(1).max(50).refine(
    (items) => new Set(items.map((item) => item.itemId)).size === items.length,
    "No repitas productos; indicá su cantidad en una sola línea"
  ),
  customerName: z.string().trim().max(80).optional(),
  notes: z.string().trim().max(500).optional(),
}).strict();

export type WhatsAppOrderInput = z.infer<typeof whatsappOrderSchema>;
