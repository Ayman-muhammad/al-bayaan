CREATE TABLE public.user_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event text NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  ua text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.user_events TO authenticated;
GRANT ALL ON public.user_events TO service_role;

ALTER TABLE public.user_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own events"
  ON public.user_events FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own events"
  ON public.user_events FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX user_events_user_created_idx ON public.user_events (user_id, created_at DESC);
CREATE INDEX user_events_event_idx ON public.user_events (event);