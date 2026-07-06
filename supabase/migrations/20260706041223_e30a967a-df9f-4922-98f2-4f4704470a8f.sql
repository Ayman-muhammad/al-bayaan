
-- ============ family_goals ============
CREATE TABLE public.family_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id uuid NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 80),
  goal_type text NOT NULL CHECK (goal_type IN ('quran_ayahs','dhikr_count','salah_days','learning_minutes','custom')),
  target_amount integer NOT NULL CHECK (target_amount > 0 AND target_amount <= 1000000),
  unit text NOT NULL DEFAULT 'count',
  deadline timestamptz NOT NULL,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.family_goals TO authenticated;
GRANT ALL ON public.family_goals TO service_role;

ALTER TABLE public.family_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view family goals"
  ON public.family_goals FOR SELECT TO authenticated
  USING (public.is_circle_member(circle_id, auth.uid()));

CREATE POLICY "Admins can create family goals"
  ON public.family_goals FOR INSERT TO authenticated
  WITH CHECK (public.is_circle_admin(circle_id, auth.uid()) AND created_by = auth.uid());

CREATE POLICY "Admins can update family goals"
  ON public.family_goals FOR UPDATE TO authenticated
  USING (public.is_circle_admin(circle_id, auth.uid()));

CREATE POLICY "Admins can delete family goals"
  ON public.family_goals FOR DELETE TO authenticated
  USING (public.is_circle_admin(circle_id, auth.uid()));

CREATE TRIGGER trg_family_goals_touch
  BEFORE UPDATE ON public.family_goals
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_family_goals_circle ON public.family_goals(circle_id, completed_at);

-- ============ family_goal_contributions ============
CREATE TABLE public.family_goal_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL REFERENCES public.family_goals(id) ON DELETE CASCADE,
  circle_id uuid NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  amount integer NOT NULL CHECK (amount > 0 AND amount <= 100000),
  note text CHECK (note IS NULL OR char_length(note) <= 200),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.family_goal_contributions TO authenticated;
GRANT ALL ON public.family_goal_contributions TO service_role;

ALTER TABLE public.family_goal_contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view contributions"
  ON public.family_goal_contributions FOR SELECT TO authenticated
  USING (public.is_circle_member(circle_id, auth.uid()));

CREATE POLICY "Members can add own contributions"
  ON public.family_goal_contributions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_circle_member(circle_id, auth.uid()));

CREATE POLICY "Users can delete own contributions"
  ON public.family_goal_contributions FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX idx_fgc_goal ON public.family_goal_contributions(goal_id);
CREATE INDEX idx_fgc_user ON public.family_goal_contributions(user_id);

-- ============ achievements ============
CREATE TABLE public.achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  code text NOT NULL,
  title text NOT NULL,
  description text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, code)
);

GRANT SELECT ON public.achievements TO authenticated;
GRANT ALL ON public.achievements TO service_role;

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own achievements"
  ON public.achievements FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX idx_achievements_user ON public.achievements(user_id, unlocked_at DESC);

-- ============ helper: unlock achievement ============
CREATE OR REPLACE FUNCTION public.unlock_achievement(_user_id uuid, _code text, _title text, _description text DEFAULT NULL, _metadata jsonb DEFAULT '{}'::jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.achievements(user_id, code, title, description, metadata)
  VALUES (_user_id, _code, _title, _description, _metadata)
  ON CONFLICT (user_id, code) DO NOTHING;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.unlock_achievement(uuid, text, text, text, jsonb) FROM anon, authenticated, PUBLIC;

-- ============ trigger: contribution side effects ============
CREATE OR REPLACE FUNCTION public.on_family_contribution()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _total integer;
  _target integer;
  _completed timestamptz;
BEGIN
  -- First contribution badge
  PERFORM public.unlock_achievement(
    NEW.user_id, 'first_family_contribution',
    'First Steps Together', 'Made your first contribution to a family goal.'
  );

  -- Check if goal is now complete
  SELECT target_amount, completed_at INTO _target, _completed
  FROM public.family_goals WHERE id = NEW.goal_id;

  IF _completed IS NULL THEN
    SELECT COALESCE(SUM(amount), 0) INTO _total
    FROM public.family_goal_contributions WHERE goal_id = NEW.goal_id;

    IF _total >= _target THEN
      UPDATE public.family_goals SET completed_at = now() WHERE id = NEW.goal_id AND completed_at IS NULL;

      -- Reward every contributor
      INSERT INTO public.achievements(user_id, code, title, description, metadata)
      SELECT DISTINCT c.user_id,
             'family_goal_completed_' || NEW.goal_id::text,
             'Family Goal Achieved',
             'Your family completed a shared goal together.',
             jsonb_build_object('goal_id', NEW.goal_id)
      FROM public.family_goal_contributions c
      WHERE c.goal_id = NEW.goal_id
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.on_family_contribution() FROM anon, authenticated, PUBLIC;

CREATE TRIGGER trg_family_contribution
  AFTER INSERT ON public.family_goal_contributions
  FOR EACH ROW EXECUTE FUNCTION public.on_family_contribution();

-- ============ leaderboard RPC ============
CREATE OR REPLACE FUNCTION public.get_family_leaderboard(_circle_id uuid)
RETURNS TABLE(user_id uuid, display_name text, avatar_url text, total_amount bigint, contributions bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_circle_member(_circle_id, auth.uid()) THEN
    RAISE EXCEPTION 'Not a circle member';
  END IF;

  RETURN QUERY
  SELECT m.user_id,
         p.display_name,
         p.avatar_url,
         COALESCE(SUM(c.amount), 0)::bigint AS total_amount,
         COUNT(c.id)::bigint AS contributions
  FROM public.circle_members m
  LEFT JOIN public.family_goal_contributions c
    ON c.circle_id = _circle_id AND c.user_id = m.user_id
  LEFT JOIN public.profiles p ON p.id = m.user_id
  WHERE m.circle_id = _circle_id
  GROUP BY m.user_id, p.display_name, p.avatar_url
  ORDER BY total_amount DESC;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_family_leaderboard(uuid) TO authenticated;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.family_goals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.family_goal_contributions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.achievements;
