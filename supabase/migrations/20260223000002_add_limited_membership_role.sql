-- Add a restricted org membership role.
ALTER TYPE public.membership_role ADD VALUE IF NOT EXISTS 'limited';

-- Limited members can only view tickets assigned to themselves.
DROP POLICY IF EXISTS "Users can view tickets in their org projects" ON public.tickets;
CREATE POLICY "Users can view tickets in their org projects"
  ON public.tickets FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.projects p
      JOIN public.memberships m ON m.org_id = p.org_id
      WHERE p.id = tickets.project_id
        AND m.user_id = auth.uid()
        AND (
          m.role::text IN ('owner', 'admin', 'member')
          OR (m.role::text = 'limited' AND tickets.assignee_id = auth.uid())
        )
    )
  );

-- Mirror the same visibility constraint for activity reads.
DROP POLICY IF EXISTS "Users can view activity events in their org projects" ON public.activity_events;
CREATE POLICY "Users can view activity events in their org projects"
  ON public.activity_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.tickets t
      JOIN public.projects p ON p.id = t.project_id
      JOIN public.memberships m ON m.org_id = p.org_id
      WHERE t.id = activity_events.ticket_id
        AND m.user_id = auth.uid()
        AND (
          m.role::text IN ('owner', 'admin', 'member')
          OR (m.role::text = 'limited' AND t.assignee_id = auth.uid())
        )
    )
  );
