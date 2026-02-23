-- Add activity event type for ticket detail edits.
ALTER TYPE public.activity_event_type
  ADD VALUE IF NOT EXISTS 'ticket_updated';
