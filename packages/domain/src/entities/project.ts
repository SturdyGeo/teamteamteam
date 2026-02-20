import { z } from "zod";

export const ProjectSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  name: z.string().min(1),
  prefix: z.string().min(1).max(10).regex(/^[A-Z][A-Z0-9]*$/),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type Project = z.infer<typeof ProjectSchema>;
