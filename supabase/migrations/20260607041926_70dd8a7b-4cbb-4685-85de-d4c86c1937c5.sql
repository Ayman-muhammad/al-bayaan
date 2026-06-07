DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'circles' AND column_name = 'invite_code'
  ) THEN
    ALTER TABLE public.circles ALTER COLUMN invite_code DROP NOT NULL;
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.circles TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.circle_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.goals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.circle_progress TO authenticated;
GRANT SELECT, INSERT ON public.circle_activity TO authenticated;
GRANT ALL ON public.circles TO service_role;
GRANT ALL ON public.circle_members TO service_role;
GRANT ALL ON public.goals TO service_role;
GRANT ALL ON public.circle_progress TO service_role;
GRANT ALL ON public.circle_activity TO service_role;

CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  code text;
  ex boolean;
BEGIN
  LOOP
    code := lpad(floor(random() * 1000000)::text, 6, '0');
    SELECT EXISTS(SELECT 1 FROM public.circles WHERE invite_code = code) INTO ex;
    EXIT WHEN NOT ex;
  END LOOP;
  RETURN code;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_invite_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.invite_code IS NULL OR NEW.invite_code = '' THEN
    NEW.invite_code := public.generate_invite_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.add_creator_as_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.circle_members (circle_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'admin')
  ON CONFLICT (circle_id, user_id) DO UPDATE SET role = 'admin';
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_invite_code ON public.circles;
CREATE TRIGGER trg_set_invite_code
BEFORE INSERT ON public.circles
FOR EACH ROW
EXECUTE FUNCTION public.set_invite_code();

DROP TRIGGER IF EXISTS trg_add_creator_as_admin ON public.circles;
CREATE TRIGGER trg_add_creator_as_admin
AFTER INSERT ON public.circles
FOR EACH ROW
EXECUTE FUNCTION public.add_creator_as_admin();

DROP TRIGGER IF EXISTS trg_circles_touch ON public.circles;
CREATE TRIGGER trg_circles_touch
BEFORE UPDATE ON public.circles
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

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
  RETURNING id, circles.invite_code INTO _circle_id, _invite_code;

  INSERT INTO public.circle_members (circle_id, user_id, role)
  VALUES (_circle_id, _uid, 'admin')
  ON CONFLICT (circle_id, user_id) DO UPDATE SET role = 'admin';

  INSERT INTO public.circle_activity (circle_id, user_id, action, metadata)
  VALUES (_circle_id, _uid, 'circle_created', jsonb_build_object('name', _clean_name));

  RETURN QUERY SELECT _circle_id, _invite_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_circle_progress_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.circle_activity (circle_id, user_id, action, metadata)
    VALUES (
      NEW.circle_id,
      NEW.user_id,
      'progress_updated',
      jsonb_build_object('goal_id', NEW.goal_id, 'verse_number', NEW.verse_number, 'status', NEW.status)
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.circle_activity (circle_id, user_id, action, metadata)
    VALUES (
      NEW.circle_id,
      NEW.user_id,
      'progress_updated',
      jsonb_build_object('goal_id', NEW.goal_id, 'verse_number', NEW.verse_number, 'status', NEW.status, 'previous_status', OLD.status)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_circle_progress_activity ON public.circle_progress;
CREATE TRIGGER trg_log_circle_progress_activity
AFTER INSERT OR UPDATE ON public.circle_progress
FOR EACH ROW
EXECUTE FUNCTION public.log_circle_progress_activity();

DROP POLICY IF EXISTS "Users create circles" ON public.circles;
CREATE POLICY "Signed-in users create own circles"
ON public.circles
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Users update own progress" ON public.circle_progress;
CREATE POLICY "Users update own progress"
ON public.circle_progress
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() AND public.is_circle_member(circle_id, auth.uid()))
WITH CHECK (user_id = auth.uid() AND public.is_circle_member(circle_id, auth.uid()));

GRANT EXECUTE ON FUNCTION public.create_family_circle(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_circle_by_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_circle_invite_code(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_circle_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_circle_admin(uuid, uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.set_invite_code() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.add_creator_as_admin() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_circle_progress_activity() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_invite_code() FROM anon, authenticated;