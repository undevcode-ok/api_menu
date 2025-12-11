import { z } from "zod";

export const createRoleSchema = z.object({
  role: z.string().min(1, "role is required"),
});

export const updateRoleSchema = z.object({
  role: z.string().optional(),
});