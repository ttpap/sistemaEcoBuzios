-- RPC para agenda mensal do aluno (modo B)
-- Retorna dias com aulas marcadas (attendance_sessions), com status final (attendance_records),
-- e justificativa (student_justifications).

CREATE OR REPLACE FUNCTION public.mode_b_student_month_schedule(
  p_project_id uuid,
  p_student_id uuid,
  p_month text
)
RETURNS TABLE(
  ymd date,
  class_id uuid,
  class_name text,
  start_time text,
  end_time text,
  finalized_at timestamptz,
  status text,
  justification_message text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    s.date as ymd,
    c.id as class_id,
    c.name as class_name,
    c.start_time,
    c.end_time,
    s.finalized_at,
    ar.status::text as status,
    j.message as justification_message
  FROM public.attendance_sessions s
  JOIN public.classes c ON c.id = s.class_id
  LEFT JOIN public.attendance_records ar
    ON ar.session_id = s.id
   AND ar.student_id = p_student_id
  LEFT JOIN public.student_justifications j
    ON j.project_id = s.project_id
   AND j.class_id = s.class_id
   AND j.student_id = p_student_id
   AND j.date = s.date
  WHERE s.project_id = p_project_id
    AND to_char(s.date, 'YYYY-MM') = p_month
    AND EXISTS (
      SELECT 1
      FROM public.class_student_enrollments e
      WHERE e.class_id = s.class_id
        AND e.student_id = p_student_id
        AND e.removed_at IS NULL
    )
  ORDER BY s.date ASC, c.start_time ASC;
$function$;

GRANT EXECUTE ON FUNCTION public.mode_b_student_month_schedule(uuid, uuid, text) TO anon, authenticated;
