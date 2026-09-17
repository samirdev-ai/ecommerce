import { z } from "zod";

export const CreateReviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().max(200).optional(),
  body: z.string().max(5000).optional(),
});
export type CreateReviewDto = z.infer<typeof CreateReviewSchema>;
