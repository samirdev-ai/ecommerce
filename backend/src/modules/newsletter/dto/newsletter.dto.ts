import { z } from "zod";

export const SubscribeSchema = z.object({
  email: z.string().email(),
});
export type SubscribeDto = z.infer<typeof SubscribeSchema>;
