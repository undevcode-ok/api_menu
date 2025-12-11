import { z } from "zod";

export const createPaymentSchema = z.object({
  userId: z.number().int().min(1),
  datePayments: z.string().min(1, "datePayments is required"),
  endDatePayments: z.string().min(1, "endDatePayments is required"),
  price: z.number().min(0, "price must be 0 or more"),
});

export const updatePaymentSchema = z.object({
  userId: z.number().optional(),
  datePayments: z.string().optional(),
  endDatePayments: z.string().optional(),
  price: z.number().min(0).optional(),
});