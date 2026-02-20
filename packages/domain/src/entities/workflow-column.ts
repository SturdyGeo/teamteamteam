import { z } from "zod";

export const WorkflowColumnSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  name: z.string().min(1),
  position: z.number().int().min(0),
  created_at: z.string().datetime(),
});

export type WorkflowColumn = z.infer<typeof WorkflowColumnSchema>;
