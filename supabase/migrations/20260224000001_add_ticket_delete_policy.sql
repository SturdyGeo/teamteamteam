-- Allow ticket deletion by org-scoped members (enforced via project -> org).
CREATE POLICY "Org members can delete tickets"
  ON public.tickets FOR DELETE
  USING (public.project_org_id(project_id) IN (SELECT public.user_org_ids()));
