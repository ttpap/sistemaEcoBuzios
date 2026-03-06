-- RPC segura para o Relatório ENEL: 1 linha por aluno matriculado no projeto no mês.

CREATE OR REPLACE FUNCTION public.enel_report_rows(p_project_id uuid, p_month text)
RETURNS TABLE (
  student_id uuid,
  name text,
  cell_phone text,
  birth_date date,
  age int,
  cpf text,
  enel_client_number text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_role public.app_role;
  v_start date;
  v_end date;
BEGIN
  SELECT p.role INTO v_role
  FROM public.profiles p
  WHERE p.user_id = auth.uid();

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF v_role <> 'admin' AND v_role <> 'coordinator' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF v_role = 'coordinator' AND NOT public.is_coordinator_assigned_to_project(p_project_id) THEN
    RAISE EXCEPTION 'forbidden_project';
  END IF;

  IF p_month !~ '^[0-9]{4}-[0-9]{2}$' THEN
    RAISE EXCEPTION 'invalid_month';
  END IF;

  v_start := to_date(p_month || '-01', 'YYYY-MM-DD');
  v_end := (v_start + interval '1 month - 1 day')::date;

  RETURN QUERY
  WITH enrolled AS (
    SELECT DISTINCT cse.student_id
    FROM public.class_student_enrollments cse
    JOIN public.classes c ON c.id = cse.class_id
    WHERE c.project_id = p_project_id
      AND cse.enrolled_at::date <= v_end
      AND (cse.removed_at IS NULL OR cse.removed_at::date >= v_start)
  )
  SELECT
    s.id AS student_id,
    COALESCE(NULLIF(trim(s.social_name), ''), s.full_name) AS name,
    COALESCE(s.cell_phone, '') AS cell_phone,
    s.birth_date,
    COALESCE(date_part('year', age(v_end, s.birth_date))::int, s.age, 0) AS age,
    COALESCE(s.cpf, '') AS cpf,
    COALESCE(s.enel_client_number, '') AS enel_client_number
  FROM enrolled e
  JOIN public.students s ON s.id = e.student_id
  ORDER BY COALESCE(NULLIF(trim(s.social_name), ''), s.full_name);
END;
$function$;

REVOKE ALL ON FUNCTION public.enel_report_rows(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enel_report_rows(uuid, text) TO authenticated;
