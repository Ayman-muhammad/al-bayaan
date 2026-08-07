DROP POLICY IF EXISTS "Owner manages family_cycles" ON public.family_cycles;
CREATE POLICY "Owner manages family_cycles" ON public.family_cycles
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owner manages family_members" ON public.family_members;
CREATE POLICY "Owner manages family_members" ON public.family_members
  FOR ALL TO authenticated
  USING (cycle_id IN (SELECT id FROM public.family_cycles WHERE user_id = auth.uid()))
  WITH CHECK (cycle_id IN (SELECT id FROM public.family_cycles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Owner manages cycle_activities" ON public.cycle_activities;
CREATE POLICY "Owner manages cycle_activities" ON public.cycle_activities
  FOR ALL TO authenticated
  USING (cycle_id IN (SELECT id FROM public.family_cycles WHERE user_id = auth.uid()))
  WITH CHECK (cycle_id IN (SELECT id FROM public.family_cycles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Owner manages cycle_checkins" ON public.cycle_checkins;
CREATE POLICY "Owner manages cycle_checkins" ON public.cycle_checkins
  FOR ALL TO authenticated
  USING (cycle_id IN (SELECT id FROM public.family_cycles WHERE user_id = auth.uid()))
  WITH CHECK (cycle_id IN (SELECT id FROM public.family_cycles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Owner manages cycle_completions" ON public.cycle_completions;
CREATE POLICY "Owner manages cycle_completions" ON public.cycle_completions
  FOR ALL TO authenticated
  USING (activity_id IN (
    SELECT a.id FROM public.cycle_activities a
    JOIN public.family_cycles c ON c.id = a.cycle_id
    WHERE c.user_id = auth.uid()))
  WITH CHECK (
    activity_id IN (
      SELECT a.id FROM public.cycle_activities a
      JOIN public.family_cycles c ON c.id = a.cycle_id
      WHERE c.user_id = auth.uid())
    AND (completed_by IS NULL OR completed_by = auth.uid())
    AND (member_id IS NULL OR member_id IN (
      SELECT m.id FROM public.family_members m
      JOIN public.family_cycles c2 ON c2.id = m.cycle_id
      WHERE c2.user_id = auth.uid()))
  );

DROP POLICY IF EXISTS "Owner manages hifz_progress" ON public.hifz_progress;
CREATE POLICY "Owner manages hifz_progress" ON public.hifz_progress
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owner manages hifz_sessions" ON public.hifz_sessions;
CREATE POLICY "Owner manages hifz_sessions" ON public.hifz_sessions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owner manages user_quran_prefs" ON public.user_quran_prefs;
CREATE POLICY "Owner manages user_quran_prefs" ON public.user_quran_prefs
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owner manages family_reminders" ON public.family_reminders;
CREATE POLICY "Owner manages family_reminders" ON public.family_reminders
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Answered questions are public" ON public.questions;

CREATE POLICY "Published non-anonymous questions are readable"
  ON public.questions FOR SELECT TO anon, authenticated
  USING (status = 'published' AND anonymous = false);

CREATE POLICY "Users read own questions"
  ON public.questions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE VIEW public.published_questions
WITH (security_invoker = off) AS
  SELECT
    q.id,
    CASE WHEN q.anonymous THEN NULL::uuid ELSE q.user_id END AS user_id,
    q.category,
    q.question_text,
    q.anonymous,
    q.status,
    q.created_at
  FROM public.questions q
  WHERE q.status = 'published';

GRANT SELECT ON public.published_questions TO anon, authenticated;