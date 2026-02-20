-- =============================================================
-- 3.3: Ticket & Workflow Tables
-- =============================================================

-- -----------------------------------------------
-- Custom ENUM type: priority
-- -----------------------------------------------
CREATE TYPE public.ticket_priority AS ENUM ('P0', 'P1', 'P2', 'P3');

-- -----------------------------------------------
-- Table: workflow_columns
-- -----------------------------------------------
CREATE TABLE public.workflow_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) >= 1),
  position INT NOT NULL CHECK (position >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, position),
  UNIQUE (project_id, name)
);

CREATE INDEX idx_workflow_columns_project_id ON public.workflow_columns(project_id);

-- -----------------------------------------------
-- Table: tickets
-- -----------------------------------------------
CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  number INT NOT NULL CHECK (number >= 1),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  description TEXT NOT NULL DEFAULT '' CHECK (char_length(description) <= 10000),
  status_column_id UUID NOT NULL REFERENCES public.workflow_columns(id),
  priority public.ticket_priority NOT NULL,
  assignee_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reporter_id UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  UNIQUE (project_id, number)
);

CREATE INDEX idx_tickets_project_id ON public.tickets(project_id);
CREATE INDEX idx_tickets_status_column_id ON public.tickets(status_column_id);
CREATE INDEX idx_tickets_assignee_id ON public.tickets(assignee_id);
CREATE INDEX idx_tickets_priority ON public.tickets(priority);

CREATE TRIGGER tickets_updated_at
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- -----------------------------------------------
-- Function: next_ticket_number
-- Atomically determines the next ticket number for a project.
-- Uses advisory lock per project to prevent race conditions.
-- -----------------------------------------------
CREATE OR REPLACE FUNCTION public.next_ticket_number(p_project_id UUID)
RETURNS INT AS $$
DECLARE
  next_num INT;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_project_id::text));

  SELECT COALESCE(MAX(number), 0) + 1
  INTO next_num
  FROM public.tickets
  WHERE project_id = p_project_id;

  RETURN next_num;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------
-- Table: tags
-- -----------------------------------------------
CREATE TABLE public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, name)
);

CREATE INDEX idx_tags_project_id ON public.tags(project_id);

-- -----------------------------------------------
-- Table: ticket_tags (join table)
-- -----------------------------------------------
CREATE TABLE public.ticket_tags (
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (ticket_id, tag_id)
);

CREATE INDEX idx_ticket_tags_tag_id ON public.ticket_tags(tag_id);
