CREATE TABLE public.live_streams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  label_en text NOT NULL,
  label_ar text NOT NULL DEFAULT '',
  desc_en text NOT NULL DEFAULT '',
  desc_ar text NOT NULL DEFAULT '',
  youtube_id text NOT NULL,
  external_url text,
  embed_params text NOT NULL DEFAULT 'rel=0&modestbranding=1&playsinline=1&iv_load_policy=3',
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.live_streams TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_streams TO authenticated;
GRANT ALL ON public.live_streams TO service_role;

ALTER TABLE public.live_streams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active streams"
  ON public.live_streams FOR SELECT
  USING (active OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert streams"
  ON public.live_streams FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update streams"
  ON public.live_streams FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete streams"
  ON public.live_streams FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_live_streams_touch
  BEFORE UPDATE ON public.live_streams
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.live_streams (slug, label_en, label_ar, desc_en, desc_ar, youtube_id, external_url, sort_order)
VALUES
  ('mecca', 'Live from Makkah', 'بث مباشر من مكة المكرمة', 'Masjid Al-Haram', 'المسجد الحرام', 'nwllJOmz3sI', 'https://www.youtube.com/watch?v=nwllJOmz3sI', 0),
  ('medina', 'Live from Madinah', 'بث مباشر من المدينة المنورة', 'Masjid An-Nabawi', 'المسجد النبوي', 'QYCZzl--IQs', 'https://www.youtube.com/watch?v=QYCZzl--IQs', 1);