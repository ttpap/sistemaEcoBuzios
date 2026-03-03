-- EcoBúzios — RPCs para calendário do aluno e justificativas no modo B

-- Lista de aulas (attendance_sessions) do mês para um aluno, já com status e justificativa.
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
  justification_message text
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
    j.message AS justification_message
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

-- Cria/atualiza justificativa (incluindo antecipada) por aluno/aula/data.
CREATE OR REPLACE FUNCTION public.mode_b_set_student_justification(
  p_project_id uuid,
  p_class_id uuid,
  p_student_id uuid,
  p_date date,
  p_message text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  existing_id uuid;
  new_id uuid;
BEGIN
  SELECT id INTO existing_id
  FROM public.student_justifications
  WHERE project_id = p_project_id
    AND class_id = p_class_id
    AND student_id = p_student_id
    AND date = p_date
  LIMIT 1;

  IF existing_id IS NOT NULL THEN
    UPDATE public.student_justifications
    SET message = p_message
    WHERE id = existing_id;
    RETURN existing_id;
  END IF;

  INSERT INTO public.student_justifications (project_id, class_id, student_id, date, message)
  VALUES (p_project_id, p_class_id, p_student_id, p_date, p_message)
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

-- Leitura de justificativas de uma turma no mês (para professor/coordenador/admin no modo B).
CREATE OR REPLACE FUNCTION public.mode_b_class_month_justifications(
  p_project_id uuid,
  p_class_id uuid,
  p_month text
)
RETURNS TABLE(
  id uuid,
  student_id uuid,
  ymd text,
  message text,
  created_at timestamptz
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
    j.id,
    j.student_id,
    to_char(j.date, 'YYYY-MM-DD') AS ymd,
    j.message,
    j.created_at
  FROM public.student_justifications j
  CROSS JOIN range rg
  WHERE j.project_id = p_project_id
    AND j.class_id = p_class_id
    AND j.date >= rg.start_date
    AND j.date < rg.end_date
  ORDER BY j.date DESC, j.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.mode_b_student_month_schedule(uuid, uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mode_b_set_student_justification(uuid, uuid, uuid, date, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mode_b_class_month_justifications(uuid, uuid, text) TO anon, authenticated;
