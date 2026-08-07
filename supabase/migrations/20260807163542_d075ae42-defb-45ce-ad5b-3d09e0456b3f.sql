DROP VIEW IF EXISTS public.published_questions;

REVOKE ALL ON FUNCTION public.create_family_circle(text, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ensure_user_records(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_circle_invite_code(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_family_leaderboard(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.join_circle_by_code(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_my_email() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_circle_admin(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_circle_member(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.unlock_achievement(uuid, text, text, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.generate_invite_code() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.join_circle_by_code(_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _circle_id UUID; _max INT; _count INT; _clean text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  _clean := nullif(trim(_code), '');
  IF _clean IS NULL OR char_length(_clean) > 20 THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;
  SELECT id, max_members INTO _circle_id, _max FROM public.circles
    WHERE invite_code = upper(_clean) OR invite_code = _clean LIMIT 1;
  IF _circle_id IS NULL THEN RAISE EXCEPTION 'Circle not found'; END IF;
  SELECT COUNT(*) INTO _count FROM public.circle_members WHERE circle_id = _circle_id;
  IF _count >= _max THEN RAISE EXCEPTION 'Circle is full'; END IF;
  INSERT INTO public.circle_members (circle_id, user_id, role)
  VALUES (_circle_id, auth.uid(), 'member')
  ON CONFLICT DO NOTHING;
  RETURN _circle_id;
END; $function$;

REVOKE ALL ON FUNCTION public.join_circle_by_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_circle_by_code(text) TO authenticated, service_role;