
-- =========================================
-- FAMILY CYCLE (intention-based)
-- =========================================
CREATE TABLE public.family_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  intention text NOT NULL,
  start_date timestamptz NOT NULL DEFAULT now(),
  duration_days int NOT NULL DEFAULT 7,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.family_cycles TO authenticated;
GRANT ALL ON public.family_cycles TO service_role;
ALTER TABLE public.family_cycles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages family_cycles" ON public.family_cycles FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES public.family_cycles(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text NOT NULL CHECK (role IN ('parent','child','spouse','sibling','other')),
  avatar_emoji text NOT NULL DEFAULT '👤',
  color text NOT NULL DEFAULT '#D4AF37',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.family_members TO authenticated;
GRANT ALL ON public.family_members TO service_role;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages family_members" ON public.family_members FOR ALL
  USING (cycle_id IN (SELECT id FROM public.family_cycles WHERE user_id = auth.uid()))
  WITH CHECK (cycle_id IN (SELECT id FROM public.family_cycles WHERE user_id = auth.uid()));

CREATE TABLE public.cycle_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES public.family_cycles(id) ON DELETE CASCADE,
  activity_type text NOT NULL CHECK (activity_type IN ('quran','adhkar_morning','adhkar_evening','gratitude','charity','dhikr')),
  title text NOT NULL,
  description text,
  surah_number int,
  start_ayah int,
  end_ayah int,
  dhikr_target int,
  time_slot text NOT NULL CHECK (time_slot IN ('morning','evening','anytime')),
  assigned_members uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cycle_activities TO authenticated;
GRANT ALL ON public.cycle_activities TO service_role;
ALTER TABLE public.cycle_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages cycle_activities" ON public.cycle_activities FOR ALL
  USING (cycle_id IN (SELECT id FROM public.family_cycles WHERE user_id = auth.uid()))
  WITH CHECK (cycle_id IN (SELECT id FROM public.family_cycles WHERE user_id = auth.uid()));

CREATE TABLE public.cycle_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES public.cycle_activities(id) ON DELETE CASCADE,
  member_id uuid REFERENCES public.family_members(id) ON DELETE SET NULL,
  completion_date date NOT NULL DEFAULT current_date,
  completed_at timestamptz NOT NULL DEFAULT now(),
  completed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
CREATE INDEX cycle_completions_activity_date_idx ON public.cycle_completions(activity_id, completion_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cycle_completions TO authenticated;
GRANT ALL ON public.cycle_completions TO service_role;
ALTER TABLE public.cycle_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages cycle_completions" ON public.cycle_completions FOR ALL
  USING (activity_id IN (
    SELECT a.id FROM public.cycle_activities a
    JOIN public.family_cycles c ON c.id = a.cycle_id
    WHERE c.user_id = auth.uid()
  ))
  WITH CHECK (activity_id IN (
    SELECT a.id FROM public.cycle_activities a
    JOIN public.family_cycles c ON c.id = a.cycle_id
    WHERE c.user_id = auth.uid()
  ));

CREATE TABLE public.cycle_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES public.family_cycles(id) ON DELETE CASCADE,
  checkin_date date NOT NULL,
  morning_complete boolean NOT NULL DEFAULT false,
  evening_complete boolean NOT NULL DEFAULT false,
  streak_count int NOT NULL DEFAULT 0,
  UNIQUE(cycle_id, checkin_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cycle_checkins TO authenticated;
GRANT ALL ON public.cycle_checkins TO service_role;
ALTER TABLE public.cycle_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages cycle_checkins" ON public.cycle_checkins FOR ALL
  USING (cycle_id IN (SELECT id FROM public.family_cycles WHERE user_id = auth.uid()))
  WITH CHECK (cycle_id IN (SELECT id FROM public.family_cycles WHERE user_id = auth.uid()));

-- =========================================
-- SCHOLARS Q&A
-- =========================================
CREATE TABLE public.scholars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  credentials text NOT NULL,
  specialization text NOT NULL,
  avatar_url text,
  bio text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.scholars TO anon, authenticated;
GRANT ALL ON public.scholars TO service_role;
ALTER TABLE public.scholars ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Scholars are public" ON public.scholars FOR SELECT USING (true);

CREATE TABLE public.questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  category text NOT NULL CHECK (category IN ('Fiqh','Aqeedah','Family','Finance','General','Seerah','Tafsir')),
  question_text text NOT NULL,
  anonymous boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','answered','published')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.questions TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.questions TO authenticated;
GRANT ALL ON public.questions TO service_role;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Answered questions are public" ON public.questions FOR SELECT
  USING (status = 'published' OR auth.uid() = user_id);
CREATE POLICY "Users submit own questions" ON public.questions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own questions" ON public.questions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  scholar_id uuid REFERENCES public.scholars(id) ON DELETE SET NULL,
  scholar_name text NOT NULL,
  scholar_avatar text,
  answer_text text NOT NULL,
  source_book text,
  source_volume text,
  source_page text,
  source_publisher text,
  source_year text,
  source_url text,
  helpful_count int NOT NULL DEFAULT 0,
  languages jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.answers TO anon, authenticated;
GRANT ALL ON public.answers TO service_role;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Answers are public" ON public.answers FOR SELECT USING (true);

-- =========================================
-- HIFZ
-- =========================================
CREATE TABLE public.hifz_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  surah_number int NOT NULL,
  ayah_number int NOT NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','review','memorized')),
  review_due date,
  streak int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, surah_number, ayah_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hifz_progress TO authenticated;
GRANT ALL ON public.hifz_progress TO service_role;
ALTER TABLE public.hifz_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages hifz_progress" ON public.hifz_progress FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.hifz_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_date date NOT NULL DEFAULT current_date,
  surah_number int NOT NULL,
  ayahs_practiced int NOT NULL DEFAULT 0,
  score int,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, session_date, surah_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hifz_sessions TO authenticated;
GRANT ALL ON public.hifz_sessions TO service_role;
ALTER TABLE public.hifz_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages hifz_sessions" ON public.hifz_sessions FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========================================
-- QURAN PREFS
-- =========================================
CREATE TABLE public.user_quran_prefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  font_family text NOT NULL DEFAULT 'Uthmani',
  font_size_level int NOT NULL DEFAULT 3 CHECK (font_size_level BETWEEN 1 AND 10),
  line_spacing text NOT NULL DEFAULT 'normal' CHECK (line_spacing IN ('compact','normal','relaxed','wide')),
  word_spacing text NOT NULL DEFAULT 'normal' CHECK (word_spacing IN ('tight','normal','wide')),
  page_theme text NOT NULL DEFAULT 'madinah_cream' CHECK (page_theme IN ('madinah_cream','sepia','dark','night_blue','pure_white')),
  show_translation boolean NOT NULL DEFAULT true,
  show_tafsir boolean NOT NULL DEFAULT false,
  reciter_name text NOT NULL DEFAULT 'Mishary Rashid Alafasy',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_quran_prefs TO authenticated;
GRANT ALL ON public.user_quran_prefs TO service_role;
ALTER TABLE public.user_quran_prefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages user_quran_prefs" ON public.user_quran_prefs FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========================================
-- FAMILY REMINDERS
-- =========================================
CREATE TABLE public.family_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  morning_enabled boolean NOT NULL DEFAULT true,
  morning_offset_minutes int NOT NULL DEFAULT 30,
  evening_enabled boolean NOT NULL DEFAULT true,
  evening_offset_minutes int NOT NULL DEFAULT 30,
  sound text NOT NULL DEFAULT 'chime' CHECK (sound IN ('adhan','chime','silent')),
  days text NOT NULL DEFAULT 'all' CHECK (days IN ('all','weekdays','weekends')),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.family_reminders TO authenticated;
GRANT ALL ON public.family_reminders TO service_role;
ALTER TABLE public.family_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages family_reminders" ON public.family_reminders FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========================================
-- updated_at triggers (reuse existing touch_updated_at)
-- =========================================
CREATE TRIGGER trg_family_cycles_touch BEFORE UPDATE ON public.family_cycles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_hifz_progress_touch BEFORE UPDATE ON public.hifz_progress
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_user_quran_prefs_touch BEFORE UPDATE ON public.user_quran_prefs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_family_reminders_touch BEFORE UPDATE ON public.family_reminders
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================
-- SEED: 8 scholars
-- =========================================
INSERT INTO public.scholars (name, credentials, specialization, bio) VALUES
  ('Sheikh Yasir Qadhi', 'PhD Islamic Studies, Yale University', 'Aqeedah, Seerah', 'Dean of Academic Affairs at The Islamic Seminary of America.'),
  ('Sheikh Nouman Ali Khan', 'Founder, Bayyinah Institute', 'Quranic Arabic, Tafsir', 'Renowned teacher of Quranic Arabic and Tafsir.'),
  ('Dr. Muhammad Salah', 'Al-Azhar University Graduate', 'Fiqh, Hadith', 'Egyptian-American scholar and TV presenter.'),
  ('Sheikh Abu Eesa Niamatullah', 'Alim, Islamic Jurisprudence', 'Fiqh, Contemporary Issues', 'Instructor at AlMaghrib Institute.'),
  ('Ustadha Yasmin Mogahed', 'MA Journalism, Wisconsin-Madison', 'Spirituality, Family', 'Author of Reclaim Your Heart.'),
  ('Sheikh Omar Suleiman', 'PhD Islamic Studies, IUM', 'Aqeedah, Social Justice', 'Founder of Yaqeen Institute for Islamic Research.'),
  ('Sheikh Haitham al-Haddad', 'Islamic Jurist', 'Fiqh, Family Law', 'UK-based scholar specializing in family jurisprudence.'),
  ('Mufti Menk', 'Madinah University Graduate', 'General Fiqh, Da''wah', 'Zimbabwean scholar with a global audience.');
