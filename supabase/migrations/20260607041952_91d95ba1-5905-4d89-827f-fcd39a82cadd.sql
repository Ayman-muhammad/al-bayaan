REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_invite_code() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.add_creator_as_admin() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_circle_progress_activity() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.generate_invite_code() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.create_family_circle(text, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.join_circle_by_code(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_circle_invite_code(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_my_email() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_circle_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_circle_admin(uuid, uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_family_circle(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_circle_by_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_circle_invite_code(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_email() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_circle_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_circle_admin(uuid, uuid) TO authenticated;