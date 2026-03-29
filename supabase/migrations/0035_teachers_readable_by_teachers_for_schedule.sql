-- Allow any logged-in teacher to read basic info of all teachers
-- (needed to display teacher names on the schedule grid)
DROP POLICY IF EXISTS teachers_select_by_teacher ON public.teachers;
CREATE POLICY teachers_select_by_teacher ON public.teachers
FOR SELECT TO authenticated
USING (
  public.current_teacher_id() IS NOT NULL
);
