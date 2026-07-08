
-- Revoke EXECUTE from anon and PUBLIC on ALL SECURITY DEFINER functions in public schema.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.add_creator_as_admin() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_invite_code() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_invite_code() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_circle_progress_activity() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.on_family_contribution() FROM anon, authenticated, PUBLIC;

-- Internal helpers used by RLS/triggers — remove client-callable access from anon & authenticated.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_circle_admin(uuid, uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_circle_member(uuid, uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_my_email() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.unlock_achievement(uuid, text, text, text, jsonb) FROM anon, authenticated, PUBLIC;

-- Intentional RPCs — remove anon, keep authenticated only.
REVOKE EXECUTE ON FUNCTION public.get_circle_invite_code(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_circle_invite_code(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.create_family_circle(text, integer) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_family_circle(text, integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.join_circle_by_code(text) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_circle_by_code(text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.ensure_user_records(text) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_user_records(text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_family_leaderboard(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_family_leaderboard(uuid) TO authenticated;
