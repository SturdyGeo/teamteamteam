-- Allow org admins (in addition to owners) to update membership roles.
DROP POLICY IF EXISTS "Org owners can update membership roles" ON public.memberships;
DROP POLICY IF EXISTS "Org owners and admins can update membership roles" ON public.memberships;

CREATE POLICY "Org owners and admins can update membership roles"
  ON public.memberships FOR UPDATE
  USING (
    org_id IN (SELECT public.user_admin_org_ids())
  );
