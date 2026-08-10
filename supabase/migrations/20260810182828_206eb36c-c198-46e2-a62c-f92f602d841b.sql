DROP POLICY IF EXISTS "Users join as self" ON public.circle_members;

CREATE POLICY "Users join as self as member"
ON public.circle_members
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() AND role = 'member');