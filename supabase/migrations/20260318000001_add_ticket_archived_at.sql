-- Add archived_at column to tickets for archive feature
ALTER TABLE public.tickets
  ADD COLUMN archived_at TIMESTAMPTZ;

-- Index for filtering archived tickets
CREATE INDEX idx_tickets_archived_at ON public.tickets(archived_at);

-- Add activity event types for archive/unarchive
ALTER TYPE public.activity_event_type ADD VALUE IF NOT EXISTS 'ticket_archived';
ALTER TYPE public.activity_event_type ADD VALUE IF NOT EXISTS 'ticket_unarchived';
