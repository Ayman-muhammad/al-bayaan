-- 1) circles: hide invite_code from direct table reads (column-level privileges)
REVOKE SELECT ON public.circles FROM authenticated;
REVOKE SELECT ON public.circles FROM anon;
GRANT SELECT (id, name, created_by, max_members, active, created_at, updated_at)
  ON public.circles TO authenticated;

-- 2) profiles: hide email from direct table reads
REVOKE SELECT ON public.profiles FROM authenticated;
REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (id, display_name, avatar_url, preferred_language, preferred_reciter, bio, created_at, updated_at)
  ON public.profiles TO authenticated;

-- 3) SECURITY DEFINER surface: guests and PUBLIC cannot execute anything; only intended RPCs for signed-in users
REVOKE ALL ON FUNCTION public.create_family_circle(text, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.join_circle_by_code(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_circle_invite_code(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ensure_user_records(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_family_leaderboard(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_my_email() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_family_circle(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_circle_by_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_circle_invite_code(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_user_records(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_family_leaderboard(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_email() TO authenticated;