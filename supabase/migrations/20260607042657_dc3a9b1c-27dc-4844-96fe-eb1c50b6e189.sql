CREATE OR REPLACE FUNCTION public.ensure_user_records(_display_name text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _email text := auth.jwt() ->> 'email';
  _name text := nullif(trim(coalesce(_display_name, '')), '');
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.profiles (id, display_name, email)
  VALUES (_uid, coalesce(_name, _email, 'Al-Bayan user'), _email)
  ON CONFLICT (id) DO UPDATE
  SET display_name = coalesce(public.profiles.display_name, excluded.display_name),
      email = coalesce(public.profiles.email, excluded.email),
      updated_at = now();

  INSERT INTO public.user_stats (user_id)
  VALUES (_uid)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_user_records(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_user_records(text) TO authenticated;