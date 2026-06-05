-- Add bio column to profiles (display_name already exists, avatar_url exists)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- User stats table for Noor Meter
CREATE TABLE IF NOT EXISTS public.user_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  days_active INTEGER NOT NULL DEFAULT 1,
  ayahs_read INTEGER NOT NULL DEFAULT 0,
  recitations_completed INTEGER NOT NULL DEFAULT 0,
  family_goals_met INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 1,
  longest_streak INTEGER NOT NULL DEFAULT 1,
  last_active_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.user_stats TO authenticated;
GRANT ALL ON public.user_stats TO service_role;

ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own stats" ON public.user_stats
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users insert own stats" ON public.user_stats
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own stats" ON public.user_stats
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins view all stats" ON public.user_stats
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Update handle_new_user trigger to also create user_stats
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_stats (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Backfill user_stats for existing users
INSERT INTO public.user_stats (user_id)
SELECT id FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;
