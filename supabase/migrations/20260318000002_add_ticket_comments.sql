-- =============================================================
-- Add ticket_comments table for ticket commenting feature
-- =============================================================

CREATE TABLE public.ticket_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 10000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for efficient ticket-based lookups
CREATE INDEX idx_ticket_comments_ticket_id ON public.ticket_comments(ticket_id);

-- Enable RLS
ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;

-- ===================
-- RLS Policies (scoped via ticket -> project -> org)
-- ===================

-- Users can view comments on tickets in their org projects
CREATE POLICY "Users can view ticket comments in their org projects"
  ON public.ticket_comments FOR SELECT
  USING (
    (SELECT public.project_org_id(project_id) FROM public.tickets WHERE id = ticket_id)
    IN (SELECT public.user_org_ids())
  );

-- Org members can create comments on tickets
CREATE POLICY "Org members can create ticket comments"
  ON public.ticket_comments FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (SELECT public.project_org_id(project_id) FROM public.tickets WHERE id = ticket_id)
    IN (SELECT public.user_org_ids())
  );

-- Users can update their own comments
CREATE POLICY "Users can update their own comments"
  ON public.ticket_comments FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own comments
CREATE POLICY "Users can delete their own comments"
  ON public.ticket_comments FOR DELETE
  USING (user_id = auth.uid());
