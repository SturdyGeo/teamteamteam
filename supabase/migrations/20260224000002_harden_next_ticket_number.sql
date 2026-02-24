-- Ensure next ticket number allocation is RLS-safe and deterministic.
-- The function runs with definer privileges but still checks org membership explicitly.
CREATE OR REPLACE FUNCTION public.next_ticket_number(p_project_id UUID)
RETURNS INT AS $$
DECLARE
  next_num INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF public.project_org_id(p_project_id) NOT IN (SELECT public.user_org_ids()) THEN
    RAISE EXCEPTION 'Not found: Project not accessible';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_project_id::text));

  SELECT COALESCE(MAX(number), 0) + 1
  INTO next_num
  FROM public.tickets
  WHERE project_id = p_project_id;

  RETURN next_num;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
