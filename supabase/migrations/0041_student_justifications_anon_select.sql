-- Permite que o role anon leia justificativas de alunos
-- (professores e coordenadores usam o cliente anon do Supabase no Modo B)
CREATE POLICY "student_justifications_anon_select"
ON public.student_justifications
FOR SELECT
TO anon
USING (true);
