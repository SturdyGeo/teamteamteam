-- =============================================================
-- Add DELETE RLS policies for orgs and projects, and allow
-- CASCADE deletes through activity_events.
-- =============================================================

-- Org owners can delete orgs
CREATE POLICY "Org owners can delete orgs"
  ON public.orgs FOR DELETE
  USING (id IN (SELECT public.user_owner_org_ids()));

-- Org owners and admins can delete projects
CREATE POLICY "Org owners and admins can delete projects"
  ON public.projects FOR DELETE
  USING (org_id IN (SELECT public.user_admin_org_ids()));

-- Drop the activity_events no-delete trigger so CASCADE works.
-- RLS already prevents direct deletes (no DELETE policy on activity_events).
-- The no-update trigger remains to preserve append-only writes.
DROP TRIGGER IF EXISTS activity_events_no_delete ON public.activity_events;
