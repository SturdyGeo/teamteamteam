import { z } from "zod";

export const TicketSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  number: z.number().int().min(1),
  title: z.string().min(1).max(200),
  description: z.string().max(10000).default(""),
  status_column_id: z.string().uuid(),
  assignee_id: z.string().uuid().nullable(),
  reporter_id: z.string().uuid(),
  tags: z.array(z.string()).default([]),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  closed_at: z.string().datetime().nullable(),
});

export type Ticket = z.infer<typeof TicketSchema>;
