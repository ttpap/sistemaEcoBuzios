-- Permite que o role anon leia teacher_project_assignments
-- (coordenadores usam o cliente anon do Supabase)
CREATE POLICY "teacher_project_assignments_anon_select"
ON public.teacher_project_assignments
FOR SELECT
TO anon
USING (true);
