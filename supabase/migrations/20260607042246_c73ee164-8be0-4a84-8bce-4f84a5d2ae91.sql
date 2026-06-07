DROP POLICY IF EXISTS "Members view circles" ON public.circles;
CREATE POLICY "Creators and members view circles"
ON public.circles
FOR SELECT
TO authenticated
USING ((created_by = auth.uid()) OR public.is_circle_member(id, auth.uid()));