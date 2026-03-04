-- Permite que o próprio aluno (Supabase Auth) edite sua ficha (students).
-- Isso é necessário para que a área /aluno consiga salvar alterações via RLS.

DROP POLICY IF EXISTS students_update_own ON public.students;
CREATE POLICY students_update_own ON public.students
FOR UPDATE TO authenticated
USING (public.is_admin() OR id = public.current_student_id())
WITH CHECK (public.is_admin() OR id = public.current_student_id());
