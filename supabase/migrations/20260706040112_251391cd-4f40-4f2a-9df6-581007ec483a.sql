
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.add_creator_as_admin() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_invite_code() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_invite_code() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_circle_progress_activity() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM anon, authenticated, PUBLIC;
