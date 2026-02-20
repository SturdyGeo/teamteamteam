-- =============================================================
-- 3.5: Row Level Security Policies
-- =============================================================

-- -----------------------------------------------
-- Helper function: get org IDs for the current user
-- -----------------------------------------------
CREATE OR REPLACE FUNCTION public.user_org_ids()
RETURNS SETOF UUID AS $$
  SELECT org_id FROM public.memberships WHERE user_id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- -----------------------------------------------
-- Helper function: get org_id for a project
-- -----------------------------------------------
CREATE OR REPLACE FUNCTION public.project_org_id(p_project_id UUID)
RETURNS UUID AS $$
  SELECT org_id FROM public.projects WHERE id = p_project_id
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ===================
-- ENABLE RLS ON ALL TABLES
-- ===================
ALTER TABLE public.orgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;

-- ===================
-- ORGS
-- ===================
CREATE POLICY "Users can view their orgs"
  ON public.orgs FOR SELECT
  USING (id IN (SELECT public.user_org_ids()));

CREATE POLICY "Authenticated users can create orgs"
  ON public.orgs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Org owners and admins can update org"
  ON public.orgs FOR UPDATE
  USING (
    id IN (
      SELECT org_id FROM public.memberships
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- ===================
-- USERS
-- ===================
CREATE POLICY "Users can view users in their orgs"
  ON public.users FOR SELECT
  USING (
    id IN (
      SELECT m.user_id FROM public.memberships m
      WHERE m.org_id IN (SELECT public.user_org_ids())
    )
    OR id = auth.uid()
  );

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ===================
-- MEMBERSHIPS
-- ===================
CREATE POLICY "Users can view memberships in their orgs"
  ON public.memberships FOR SELECT
  USING (org_id IN (SELECT public.user_org_ids()));

CREATE POLICY "Org owners and admins can add members"
  ON public.memberships FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM public.memberships
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Bootstrap: user creating an org gets the first membership (owner)
CREATE POLICY "Users can create their own owner membership"
  ON public.memberships FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND role = 'owner'
    AND NOT EXISTS (
      SELECT 1 FROM public.memberships m WHERE m.org_id = memberships.org_id
    )
  );

CREATE POLICY "Org owners can update membership roles"
  ON public.memberships FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM public.memberships
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Org owners can remove members"
  ON public.memberships FOR DELETE
  USING (
    org_id IN (
      SELECT org_id FROM public.memberships
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- ===================
-- PROJECTS
-- ===================
CREATE POLICY "Users can view projects in their orgs"
  ON public.projects FOR SELECT
  USING (org_id IN (SELECT public.user_org_ids()));

CREATE POLICY "Org owners and admins can create projects"
  ON public.projects FOR INSERT
  WITH CHECK (org_id IN (
    SELECT org_id FROM public.memberships
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

CREATE POLICY "Org owners and admins can update projects"
  ON public.projects FOR UPDATE
  USING (org_id IN (
    SELECT org_id FROM public.memberships
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

-- ===================
-- WORKFLOW COLUMNS (scoped via project -> org)
-- ===================
CREATE POLICY "Users can view workflow columns in their org projects"
  ON public.workflow_columns FOR SELECT
  USING (public.project_org_id(project_id) IN (SELECT public.user_org_ids()));

CREATE POLICY "Org owners and admins can create workflow columns"
  ON public.workflow_columns FOR INSERT
  WITH CHECK (public.project_org_id(project_id) IN (
    SELECT org_id FROM public.memberships
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

CREATE POLICY "Org owners and admins can update workflow columns"
  ON public.workflow_columns FOR UPDATE
  USING (public.project_org_id(project_id) IN (
    SELECT org_id FROM public.memberships
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

CREATE POLICY "Org owners and admins can delete workflow columns"
  ON public.workflow_columns FOR DELETE
  USING (public.project_org_id(project_id) IN (
    SELECT org_id FROM public.memberships
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

-- ===================
-- TICKETS (scoped via project -> org)
-- ===================
CREATE POLICY "Users can view tickets in their org projects"
  ON public.tickets FOR SELECT
  USING (public.project_org_id(project_id) IN (SELECT public.user_org_ids()));

CREATE POLICY "Org members can create tickets"
  ON public.tickets FOR INSERT
  WITH CHECK (public.project_org_id(project_id) IN (SELECT public.user_org_ids()));

CREATE POLICY "Org members can update tickets"
  ON public.tickets FOR UPDATE
  USING (public.project_org_id(project_id) IN (SELECT public.user_org_ids()));

-- ===================
-- TAGS (scoped via project -> org)
-- ===================
CREATE POLICY "Users can view tags in their org projects"
  ON public.tags FOR SELECT
  USING (public.project_org_id(project_id) IN (SELECT public.user_org_ids()));

CREATE POLICY "Org members can create tags"
  ON public.tags FOR INSERT
  WITH CHECK (public.project_org_id(project_id) IN (SELECT public.user_org_ids()));

-- ===================
-- TICKET_TAGS (scoped via ticket -> project -> org)
-- ===================
CREATE POLICY "Users can view ticket tags in their org projects"
  ON public.ticket_tags FOR SELECT
  USING (
    (SELECT public.project_org_id(project_id) FROM public.tickets WHERE id = ticket_id)
    IN (SELECT public.user_org_ids())
  );

CREATE POLICY "Org members can add ticket tags"
  ON public.ticket_tags FOR INSERT
  WITH CHECK (
    (SELECT public.project_org_id(project_id) FROM public.tickets WHERE id = ticket_id)
    IN (SELECT public.user_org_ids())
  );

CREATE POLICY "Org members can remove ticket tags"
  ON public.ticket_tags FOR DELETE
  USING (
    (SELECT public.project_org_id(project_id) FROM public.tickets WHERE id = ticket_id)
    IN (SELECT public.user_org_ids())
  );

-- ===================
-- ACTIVITY EVENTS (scoped via ticket -> project -> org)
-- Append-only: INSERT and SELECT only
-- ===================
CREATE POLICY "Users can view activity events in their org projects"
  ON public.activity_events FOR SELECT
  USING (
    (SELECT public.project_org_id(project_id) FROM public.tickets WHERE id = ticket_id)
    IN (SELECT public.user_org_ids())
  );

CREATE POLICY "Org members can create activity events"
  ON public.activity_events FOR INSERT
  WITH CHECK (
    (SELECT public.project_org_id(project_id) FROM public.tickets WHERE id = ticket_id)
    IN (SELECT public.user_org_ids())
  );
