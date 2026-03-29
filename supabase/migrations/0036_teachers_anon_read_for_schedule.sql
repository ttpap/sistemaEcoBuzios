-- Allow anon (Mode B / teacher sessions) to read teacher names
-- needed to display names on the schedule grid
DROP POLICY IF EXISTS teachers_anon_read ON public.teachers;
CREATE POLICY teachers_anon_read ON public.teachers
FOR SELECT TO anon USING (true);
