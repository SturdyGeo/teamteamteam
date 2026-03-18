import { z } from "zod";

export const TicketCommentSchema = z.object({
  id: z.string().uuid(),
  ticket_id: z.string().uuid(),
  user_id: z.string().uuid(),
  content: z.string().min(1).max(10000),
  created_at: z.string().datetime(),
});

export type TicketComment = z.infer<typeof TicketCommentSchema>;
