CREATE OR REPLACE FUNCTION public.create_family_circle(_name text, _max_members integer DEFAULT 5)
RETURNS TABLE(circle_id uuid, invite_code text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _circle_id uuid;
  _invite_code text;
  _clean_name text := nullif(trim(_name), '');
  _safe_max integer := greatest(2, least(coalesce(_max_members, 5), 20));
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _clean_name IS NULL OR char_length(_clean_name) > 50 THEN
    RAISE EXCEPTION 'Circle name must be between 1 and 50 characters';
  END IF;

  INSERT INTO public.circles (name, created_by, max_members, invite_code)
  VALUES (_clean_name, _uid, _safe_max, public.generate_invite_code())
  RETURNING id, public.circles.invite_code INTO _circle_id, _invite_code;

  INSERT INTO public.circle_members (circle_id, user_id, role)
  VALUES (_circle_id, _uid, 'admin')
  ON CONFLICT ON CONSTRAINT circle_members_circle_id_user_id_key
  DO UPDATE SET role = 'admin';

  INSERT INTO public.circle_activity (circle_id, user_id, action, metadata)
  VALUES (_circle_id, _uid, 'circle_created', jsonb_build_object('name', _clean_name));

  RETURN QUERY SELECT _circle_id, _invite_code;
END;
$$;

GRANT SELECT (id, display_name, avatar_url, bio, preferred_language, preferred_reciter, created_at, updated_at) ON public.profiles TO authenticated;
GRANT INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
REVOKE SELECT (email) ON public.profiles FROM authenticated, anon;
GRANT EXECUTE ON FUNCTION public.create_family_circle(text, integer) TO authenticated;