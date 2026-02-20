-- =============================================================
-- Fix infinite recursion in memberships RLS policies
-- =============================================================
-- Self-referencing policies on memberships cause recursion because
-- subqueries within INSERT/UPDATE/DELETE policies trigger the
-- SELECT RLS policy on the same table.
-- Fix: wrap self-referencing subqueries in SECURITY DEFINER functions
-- (which bypass RLS, breaking the cycle).

-- -----------------------------------------------
-- Helper: org IDs where user is owner or admin
-- -----------------------------------------------
CREATE OR REPLACE FUNCTION public.user_admin_org_ids()
RETURNS SETOF UUID AS $$
  SELECT org_id FROM public.memberships
  WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- -----------------------------------------------
-- Helper: org IDs where user is owner
-- -----------------------------------------------
CREATE OR REPLACE FUNCTION public.user_owner_org_ids()
RETURNS SETOF UUID AS $$
  SELECT org_id FROM public.memberships
  WHERE user_id = auth.uid() AND role = 'owner'
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- -----------------------------------------------
-- Helper: check if an org has any members
-- -----------------------------------------------
CREATE OR REPLACE FUNCTION public.org_has_members(p_org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM public.memberships WHERE org_id = p_org_id)
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- -----------------------------------------------
-- Recreate self-referencing policies using helpers
-- -----------------------------------------------

-- 1. Bootstrap: first membership for a new org (INSERT)
DROP POLICY IF EXISTS "Users can create their own owner membership" ON public.memberships;
CREATE POLICY "Users can create their own owner membership"
  ON public.memberships FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND role = 'owner'
    AND NOT public.org_has_members(org_id)
  );

-- 2. Owner/admin can add members (INSERT)
DROP POLICY IF EXISTS "Org owners and admins can add members" ON public.memberships;
CREATE POLICY "Org owners and admins can add members"
  ON public.memberships FOR INSERT
  WITH CHECK (
    org_id IN (SELECT public.user_admin_org_ids())
  );

-- 3. Owner can update roles (UPDATE)
DROP POLICY IF EXISTS "Org owners can update membership roles" ON public.memberships;
CREATE POLICY "Org owners can update membership roles"
  ON public.memberships FOR UPDATE
  USING (
    org_id IN (SELECT public.user_owner_org_ids())
  );

-- 4. Owner can remove members (DELETE)
DROP POLICY IF EXISTS "Org owners can remove members" ON public.memberships;
CREATE POLICY "Org owners can remove members"
  ON public.memberships FOR DELETE
  USING (
    org_id IN (SELECT public.user_owner_org_ids())
  );
