import { z } from "zod";

export const AddCartItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(99).default(1),
});
export type AddCartItemDto = z.infer<typeof AddCartItemSchema>;

export const UpdateCartItemSchema = z.object({
  quantity: z.coerce.number().int().min(0).max(99),
});
export type UpdateCartItemDto = z.infer<typeof UpdateCartItemSchema>;
