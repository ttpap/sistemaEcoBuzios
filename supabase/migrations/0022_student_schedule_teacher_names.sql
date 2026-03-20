-- Extende mode_b_student_month_schedule para retornar nomes dos professores da turma
CREATE OR REPLACE FUNCTION public.mode_b_student_month_schedule(
  p_project_id uuid,
  p_student_id uuid,
  p_month text
)
RETURNS TABLE(
  ymd text,
  class_id uuid,
  class_name text,
  start_time text,
  end_time text,
  finalized_at timestamptz,
  status public.attendance_status,
  justification_message text,
  teacher_names text[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH params AS (
    SELECT (p_month || '-01')::date AS start_date
  ),
  range AS (
    SELECT start_date, (start_date + INTERVAL '1 month')::date AS end_date
    FROM params
  )
  SELECT
    to_char(s.date, 'YYYY-MM-DD') AS ymd,
    s.class_id,
    c.name AS class_name,
    c.start_time,
    c.end_time,
    s.finalized_at,
    r.status,
    j.message AS justification_message,
    ARRAY(
      SELECT t.full_name
      FROM public.class_teachers ct
      JOIN public.teachers t ON t.id = ct.teacher_id
      WHERE ct.class_id = s.class_id
      ORDER BY t.name
    ) AS teacher_names
  FROM public.attendance_sessions s
  JOIN public.classes c ON c.id = s.class_id
  JOIN public.class_student_enrollments e ON e.class_id = s.class_id
  LEFT JOIN public.attendance_records r
    ON r.session_id = s.id AND r.student_id = p_student_id
  LEFT JOIN public.student_justifications j
    ON j.project_id = s.project_id
   AND j.class_id = s.class_id
   AND j.student_id = p_student_id
   AND j.date = s.date
  CROSS JOIN range rg
  WHERE s.project_id = p_project_id
    AND e.student_id = p_student_id
    AND e.removed_at IS NULL
    AND s.date >= rg.start_date
    AND s.date < rg.end_date
  ORDER BY s.date ASC, c.start_time ASC;
$$;
