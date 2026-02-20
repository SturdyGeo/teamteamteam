import { z } from "zod";

export const OrgSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type Org = z.infer<typeof OrgSchema>;
