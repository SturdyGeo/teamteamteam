-- Security-definer lookup used by invite flow so org-scoped RLS visibility
-- does not block resolving existing users by email.
CREATE OR REPLACE FUNCTION public.user_id_by_email(p_email TEXT)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT u.id
  FROM public.users u
  WHERE lower(trim(u.email)) = lower(trim(p_email))
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.user_id_by_email(TEXT) TO authenticated;
