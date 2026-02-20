-- =============================================================
-- 3.4: Activity Events — Append-Only Log
-- =============================================================

-- -----------------------------------------------
-- Custom ENUM type: event_type
-- -----------------------------------------------
CREATE TYPE public.activity_event_type AS ENUM (
  'ticket_created',
  'status_changed',
  'assignee_changed',
  'priority_changed',
  'tag_added',
  'tag_removed',
  'ticket_closed',
  'ticket_reopened'
);

-- -----------------------------------------------
-- Table: activity_events
-- -----------------------------------------------
CREATE TABLE public.activity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES public.users(id),
  event_type public.activity_event_type NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_events_ticket_id ON public.activity_events(ticket_id);
CREATE INDEX idx_activity_events_actor_id ON public.activity_events(actor_id);
CREATE INDEX idx_activity_events_created_at ON public.activity_events(created_at);

-- -----------------------------------------------
-- Append-only enforcement
-- Prevent UPDATE and DELETE via triggers (belt-and-suspenders
-- alongside RLS policies).
-- -----------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_activity_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Activity events are append-only. UPDATE and DELETE are not allowed.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER activity_events_no_update
  BEFORE UPDATE ON public.activity_events
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_activity_modification();

CREATE TRIGGER activity_events_no_delete
  BEFORE DELETE ON public.activity_events
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_activity_modification();
