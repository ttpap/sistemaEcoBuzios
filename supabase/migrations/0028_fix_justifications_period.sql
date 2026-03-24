-- Corrige mode_b_class_month_justifications para:
-- 1) Retornar end_date (para exibir período nas visões de professor/coordenador/admin)
-- 2) Capturar justificativas de período que COMEÇARAM antes do mês mas se ESTENDEM até ele

CREATE OR REPLACE FUNCTION public.mode_b_class_month_justifications(
  p_project_id uuid,
  p_class_id uuid,
  p_month text
)
RETURNS TABLE(
  id uuid,
  student_id uuid,
  ymd text,
  end_ymd text,
  message text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH params AS (
    SELECT (p_month || '-01')::date AS month_start
  ),
  range AS (
    SELECT
      month_start,
      (month_start + INTERVAL '1 month')::date AS month_end
    FROM params
  )
  SELECT
    j.id,
    j.student_id,
    to_char(j.date, 'YYYY-MM-DD') AS ymd,
    to_char(COALESCE(j.end_date, j.date), 'YYYY-MM-DD') AS end_ymd,
    j.message,
    j.created_at
  FROM public.student_justifications j
  CROSS JOIN range rg
  WHERE j.project_id = p_project_id
    AND j.class_id = p_class_id
    -- Inclui justificativas cujo período se SOBREPÕE ao mês consultado
    -- (início antes do fim do mês E fim depois do início do mês)
    AND j.date < rg.month_end
    AND COALESCE(j.end_date, j.date) >= rg.month_start
  ORDER BY j.date DESC, j.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.mode_b_class_month_justifications(uuid, uuid, text) TO anon, authenticated;
