-- Atualiza public_attendance_stats:
-- presença = presente + atrasado + justificada
-- falta = apenas falta

CREATE OR REPLACE FUNCTION public.public_attendance_stats(
  p_project_ids uuid[] DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_ano int := EXTRACT(YEAR FROM CURRENT_DATE)::int;
BEGIN
  WITH sessoes AS (
    SELECT
      s.id AS session_id,
      s.date,
      to_char(s.date, 'YYYY-MM') AS mes
    FROM public.attendance_sessions s
    WHERE EXTRACT(YEAR FROM s.date) = v_ano
      AND (p_project_ids IS NULL OR s.project_id = ANY(p_project_ids))
  ),
  registros AS (
    SELECT
      s.mes,
      r.status
    FROM sessoes s
    JOIN public.attendance_records r ON r.session_id = s.session_id
  ),
  mensal AS (
    SELECT
      mes,
      COUNT(*) AS total_registros,
      COUNT(*) FILTER (WHERE status IN ('presente', 'atrasado', 'justificada')) AS total_presencas,
      COUNT(*) FILTER (WHERE status = 'falta')                                  AS total_faltas,
      COUNT(*) FILTER (WHERE status = 'atrasado')                               AS total_atrasos,
      COUNT(*) FILTER (WHERE status = 'justificada')                            AS total_justificadas
    FROM registros
    GROUP BY mes
    ORDER BY mes
  ),
  anual AS (
    SELECT
      COUNT(*) AS total_registros,
      COUNT(*) FILTER (WHERE status IN ('presente', 'atrasado', 'justificada')) AS total_presencas,
      COUNT(*) FILTER (WHERE status = 'falta')                                  AS total_faltas,
      COUNT(*) FILTER (WHERE status = 'atrasado')                               AS total_atrasos,
      COUNT(*) FILTER (WHERE status = 'justificada')                            AS total_justificadas
    FROM registros
  )
  SELECT jsonb_build_object(
    'ano', v_ano,
    'mensal', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'mes', mes,
            'total_registros', total_registros,
            'total_presencas', total_presencas,
            'total_faltas', total_faltas,
            'total_atrasos', total_atrasos,
            'total_justificadas', total_justificadas,
            'percentual_presenca',
              CASE WHEN total_registros > 0
                THEN round((total_presencas::numeric / total_registros) * 100, 1)
                ELSE 0
              END
          ) ORDER BY mes
        )
        FROM mensal
      ),
      '[]'::jsonb
    ),
    'anual', (
      SELECT jsonb_build_object(
        'total_registros', total_registros,
        'total_presencas', total_presencas,
        'total_faltas', total_faltas,
        'total_atrasos', total_atrasos,
        'total_justificadas', total_justificadas,
        'percentual_presenca',
          CASE WHEN total_registros > 0
            THEN round((total_presencas::numeric / total_registros) * 100, 1)
            ELSE 0
          END
      )
      FROM anual
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.public_attendance_stats(uuid[]) TO service_role;
