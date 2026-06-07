-- Ensure triggers exist (they were missing, causing circle creation to fail)
DROP TRIGGER IF EXISTS trg_set_invite_code ON public.circles;
CREATE TRIGGER trg_set_invite_code
BEFORE INSERT ON public.circles
FOR EACH ROW EXECUTE FUNCTION public.set_invite_code();

DROP TRIGGER IF EXISTS trg_add_creator_as_admin ON public.circles;
CREATE TRIGGER trg_add_creator_as_admin
AFTER INSERT ON public.circles
FOR EACH ROW EXECUTE FUNCTION public.add_creator_as_admin();

-- updated_at maintenance
DROP TRIGGER IF EXISTS trg_circles_touch ON public.circles;
CREATE TRIGGER trg_circles_touch
BEFORE UPDATE ON public.circles
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Allow the triggers (SECURITY DEFINER) to execute; they were locked down earlier
GRANT EXECUTE ON FUNCTION public.set_invite_code() TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_creator_as_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_invite_code() TO authenticated;