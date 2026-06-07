DROP TRIGGER IF EXISTS trg_add_creator ON public.circles;
DROP TRIGGER IF EXISTS trg_circle_invite_code ON public.circles;
DROP TRIGGER IF EXISTS trg_circles_updated ON public.circles;

REVOKE ALL ON public.circles FROM anon;
REVOKE ALL ON public.circle_members FROM anon;
REVOKE ALL ON public.goals FROM anon;
REVOKE ALL ON public.circle_progress FROM anon;
REVOKE ALL ON public.circle_activity FROM anon;

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