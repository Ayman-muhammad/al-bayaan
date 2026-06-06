
-- Circles
CREATE TABLE public.circles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 50),
  invite_code TEXT UNIQUE NOT NULL,
  created_by UUID NOT NULL,
  max_members INTEGER NOT NULL DEFAULT 5,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Members
CREATE TABLE public.circle_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin','member','viewer')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(circle_id, user_id)
);

-- Goals
CREATE TABLE public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  surah_number INTEGER NOT NULL CHECK (surah_number BETWEEN 1 AND 114),
  start_verse INTEGER NOT NULL CHECK (start_verse >= 1),
  end_verse INTEGER NOT NULL,
  deadline TIMESTAMPTZ NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  CHECK (end_verse >= start_verse)
);

-- Progress (per user per verse per goal)
CREATE TABLE public.circle_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  verse_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','memorized','reviewing','needs_help')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(goal_id, user_id, verse_number)
);

-- Activity log
CREATE TABLE public.circle_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- GRANTS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.circles TO authenticated;
GRANT ALL ON public.circles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.circle_members TO authenticated;
GRANT ALL ON public.circle_members TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.goals TO authenticated;
GRANT ALL ON public.goals TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.circle_progress TO authenticated;
GRANT ALL ON public.circle_progress TO service_role;
GRANT SELECT, INSERT ON public.circle_activity TO authenticated;
GRANT ALL ON public.circle_activity TO service_role;

-- Enable RLS
ALTER TABLE public.circles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circle_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circle_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circle_activity ENABLE ROW LEVEL SECURITY;

-- Security-definer helpers (avoid recursive RLS)
CREATE OR REPLACE FUNCTION public.is_circle_member(_circle_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.circle_members WHERE circle_id = _circle_id AND user_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION public.is_circle_admin(_circle_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.circle_members WHERE circle_id = _circle_id AND user_id = _user_id AND role = 'admin');
$$;

-- Policies: circles
CREATE POLICY "Members view circles" ON public.circles FOR SELECT TO authenticated
  USING (public.is_circle_member(id, auth.uid()));
CREATE POLICY "Users create circles" ON public.circles FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "Admins update circles" ON public.circles FOR UPDATE TO authenticated
  USING (public.is_circle_admin(id, auth.uid()));
CREATE POLICY "Admins delete circles" ON public.circles FOR DELETE TO authenticated
  USING (public.is_circle_admin(id, auth.uid()));

-- Policies: circle_members
CREATE POLICY "Members see fellow members" ON public.circle_members FOR SELECT TO authenticated
  USING (public.is_circle_member(circle_id, auth.uid()));
CREATE POLICY "Users join as self" ON public.circle_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users leave self / admin remove" ON public.circle_members FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_circle_admin(circle_id, auth.uid()));

-- Policies: goals
CREATE POLICY "Members view goals" ON public.goals FOR SELECT TO authenticated
  USING (public.is_circle_member(circle_id, auth.uid()));
CREATE POLICY "Admins create goals" ON public.goals FOR INSERT TO authenticated
  WITH CHECK (public.is_circle_admin(circle_id, auth.uid()) AND created_by = auth.uid());
CREATE POLICY "Admins update goals" ON public.goals FOR UPDATE TO authenticated
  USING (public.is_circle_admin(circle_id, auth.uid()));
CREATE POLICY "Admins delete goals" ON public.goals FOR DELETE TO authenticated
  USING (public.is_circle_admin(circle_id, auth.uid()));

-- Policies: circle_progress
CREATE POLICY "Members view progress" ON public.circle_progress FOR SELECT TO authenticated
  USING (public.is_circle_member(circle_id, auth.uid()));
CREATE POLICY "Users insert own progress" ON public.circle_progress FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_circle_member(circle_id, auth.uid()));
CREATE POLICY "Users update own progress" ON public.circle_progress FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Users delete own progress" ON public.circle_progress FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Policies: circle_activity
CREATE POLICY "Members view activity" ON public.circle_activity FOR SELECT TO authenticated
  USING (public.is_circle_member(circle_id, auth.uid()));
CREATE POLICY "Members add activity" ON public.circle_activity FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_circle_member(circle_id, auth.uid()));

-- Invite code generation
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE code TEXT; ex BOOLEAN;
BEGIN
  LOOP
    code := LPAD(FLOOR(RANDOM()*1000000)::TEXT, 6, '0');
    SELECT EXISTS(SELECT 1 FROM public.circles WHERE invite_code = code) INTO ex;
    EXIT WHEN NOT ex;
  END LOOP;
  RETURN code;
END; $$;

CREATE OR REPLACE FUNCTION public.set_invite_code()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.invite_code IS NULL OR NEW.invite_code = '' THEN
    NEW.invite_code := public.generate_invite_code();
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_circle_invite_code BEFORE INSERT ON public.circles
  FOR EACH ROW EXECUTE FUNCTION public.set_invite_code();

-- Auto-add creator as admin member
CREATE OR REPLACE FUNCTION public.add_creator_as_admin()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.circle_members (circle_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'admin')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_add_creator AFTER INSERT ON public.circles
  FOR EACH ROW EXECUTE FUNCTION public.add_creator_as_admin();

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_circles_updated BEFORE UPDATE ON public.circles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Join by code: secure function so users can join without seeing other circles
CREATE OR REPLACE FUNCTION public.join_circle_by_code(_code TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _circle_id UUID; _max INT; _count INT;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT id, max_members INTO _circle_id, _max FROM public.circles
    WHERE invite_code = UPPER(_code) OR invite_code = _code LIMIT 1;
  IF _circle_id IS NULL THEN RAISE EXCEPTION 'Circle not found'; END IF;
  SELECT COUNT(*) INTO _count FROM public.circle_members WHERE circle_id = _circle_id;
  IF _count >= _max THEN RAISE EXCEPTION 'Circle is full'; END IF;
  INSERT INTO public.circle_members (circle_id, user_id, role)
  VALUES (_circle_id, auth.uid(), 'member')
  ON CONFLICT DO NOTHING;
  RETURN _circle_id;
END; $$;

GRANT EXECUTE ON FUNCTION public.join_circle_by_code(TEXT) TO authenticated;
