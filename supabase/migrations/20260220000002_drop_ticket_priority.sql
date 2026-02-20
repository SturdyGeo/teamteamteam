-- Drop priority feature from tickets
-- Note: 'priority_changed' value is left in the activity_event_type enum
-- because existing activity_events rows reference it. The domain code
-- simply won't produce new events of this type.

DROP INDEX IF EXISTS idx_tickets_priority;
ALTER TABLE public.tickets DROP COLUMN IF EXISTS priority;
DROP TYPE IF EXISTS ticket_priority;
