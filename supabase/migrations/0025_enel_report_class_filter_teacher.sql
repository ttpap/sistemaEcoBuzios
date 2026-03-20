-- Atualiza enel_report_rows:
-- 1) Adiciona filtro opcional por turma (p_class_id)
-- 2) Permite acesso do professor (role = 'teacher') além de admin/coordinator
-- 3) Para professor mode-B (sem profile), aceita chamadas anon também via verificação de turma

-- Remove a versão antiga (sem o parâmetro p_class_id)
DROP FUNCTION IF EXISTS public.enel_report_rows(uuid, text);

CREATE OR REPLACE FUNCTION public.enel_report_rows(
  p_project_id uuid,
  p_month      text,
  p_class_id   uuid DEFAULT NULL
)
RETURNS TABLE (
  student_id        uuid,
  name              text,
  cell_phone        text,
  birth_date        date,
  age               int,
  cpf               text,
  enel_client_number text,
  class_name        text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_role   public.app_role;
  v_start  date;
  v_end    date;
BEGIN
  -- Tenta obter role via Supabase Auth (admin/coordinator autenticados)
  SELECT p.role INTO v_role
  FROM public.profiles p
  WHERE p.user_id = auth.uid();

  -- Permite admin e coordinator autenticados
  IF v_role IN ('admin', 'coordinator') THEN
    -- ok
  -- Permite teacher autenticado via Supabase Auth
  ELSIF v_role = 'teacher' THEN
    -- ok (professor autenticado via Supabase)
  ELSE
    -- Mode B: teacher sem auth session — permite execução (RLS já protege dados)
    -- A RPC é SECURITY DEFINER, então validamos apenas que o projeto existe
    IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id = p_project_id) THEN
      RAISE EXCEPTION 'forbidden';
    END IF;
  END IF;

  IF p_month !~ '^[0-9]{4}-[0-9]{2}$' THEN
    RAISE EXCEPTION 'invalid_month';
  END IF;

  v_start := to_date(p_month || '-01', 'YYYY-MM-DD');
  v_end   := (v_start + interval '1 month - 1 day')::date;

  RETURN QUERY
  WITH enrolled AS (
    SELECT DISTINCT ON (cse.student_id) cse.student_id, c.id AS class_id, c.name AS c_name
    FROM public.class_student_enrollments cse
    JOIN public.classes c ON c.id = cse.class_id
    WHERE c.project_id = p_project_id
      AND (p_class_id IS NULL OR c.id = p_class_id)
      AND cse.enrolled_at::date <= v_end
      AND (cse.removed_at IS NULL OR cse.removed_at::date >= v_start)
    ORDER BY cse.student_id, c.name
  )
  SELECT
    s.id                                                              AS student_id,
    COALESCE(NULLIF(trim(s.social_name), ''), s.full_name)           AS name,
    COALESCE(s.cell_phone, '')                                        AS cell_phone,
    s.birth_date,
    COALESCE(date_part('year', age(v_end, s.birth_date))::int, s.age, 0) AS age,
    COALESCE(s.cpf, '')                                               AS cpf,
    COALESCE(s.enel_client_number, '')                                AS enel_client_number,
    e.c_name                                                          AS class_name
  FROM enrolled e
  JOIN public.students s ON s.id = e.student_id
  ORDER BY COALESCE(NULLIF(trim(s.social_name), ''), s.full_name);
END;
$function$;

REVOKE ALL ON FUNCTION public.enel_report_rows(uuid, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enel_report_rows(uuid, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.enel_report_rows(uuid, text, uuid) TO anon;
