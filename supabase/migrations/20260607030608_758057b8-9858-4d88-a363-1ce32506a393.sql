
-- 1. Fix search_path on touch_updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- 2. Revoke EXECUTE on internal SECURITY DEFINER functions from anon/authenticated
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.add_creator_as_admin() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_invite_code() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_invite_code() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM anon, authenticated, PUBLIC;

-- has_role, is_circle_member, is_circle_admin are used in RLS policies; keep accessible to authenticated
-- join_circle_by_code is intentionally callable by authenticated users
GRANT EXECUTE ON FUNCTION public.join_circle_by_code(text) TO authenticated;

-- 3. Restrict invite_code column on circles to admins only
REVOKE SELECT ON public.circles FROM authenticated;
GRANT SELECT (id, name, max_members, created_by, active, created_at, updated_at)
  ON public.circles TO authenticated;

-- Helper RPC: only circle admin can fetch invite code
CREATE OR REPLACE FUNCTION public.get_circle_invite_code(_circle_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _code text;
BEGIN
  IF NOT public.is_circle_admin(_circle_id, auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT invite_code INTO _code FROM public.circles WHERE id = _circle_id;
  RETURN _code;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_circle_invite_code(uuid) TO authenticated;

-- 4. Profiles: allow circle co-members to see basic fields, hide email column
REVOKE SELECT ON public.profiles FROM authenticated;
GRANT SELECT (id, display_name, avatar_url, bio, preferred_language, preferred_reciter, created_at, updated_at)
  ON public.profiles TO authenticated;
-- email column: only owner via separate grant
GRANT SELECT (email) ON public.profiles TO authenticated;
-- Existing policy "Users can view own profile" allows email for self; add policy for co-members on non-email fields
-- Since column grant for email is broad, restrict via policy: add a co-member SELECT policy
CREATE POLICY "Circle co-members view basic profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.circle_members cm1
    JOIN public.circle_members cm2 ON cm1.circle_id = cm2.circle_id
    WHERE cm1.user_id = auth.uid() AND cm2.user_id = profiles.id
  )
);

-- Note: since email column SELECT is granted to authenticated, RLS still restricts rows.
-- The co-member policy returns the row, which would include email if requested.
-- To prevent that, revoke email column grant from authenticated entirely and create a view for self-email if needed.
REVOKE SELECT (email) ON public.profiles FROM authenticated;
-- Re-grant via a security definer function for self
CREATE OR REPLACE FUNCTION public.get_my_email()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM public.profiles WHERE id = auth.uid();
$$;
GRANT EXECUTE ON FUNCTION public.get_my_email() TO authenticated;
