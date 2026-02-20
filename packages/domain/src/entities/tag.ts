import { z } from "zod";

export const TagSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  name: z.string().min(1).max(50),
  created_at: z.string().datetime(),
});

export type Tag = z.infer<typeof TagSchema>;
