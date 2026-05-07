-- Make public_attendance_stats global per project (no year filter, fixed 2h per aula).
-- Rationale: project may span multiple years; counts must reflect total project lifetime.

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
  v_horas_por_aula numeric := 2.0;
BEGIN
  WITH sessoes_dur AS (
    SELECT
      s.id   AS session_id,
      to_char(s.date, 'YYYY-MM') AS mes,
      v_horas_por_aula AS duracao_horas
    FROM public.attendance_sessions s
    JOIN public.classes c ON c.id = s.class_id
    WHERE s.finalized_at IS NOT NULL
      AND (p_project_ids IS NULL OR s.project_id = ANY(p_project_ids))
  ),
  totais AS (
    SELECT
      COUNT(*)::int                          AS total_aulas,
      ROUND(SUM(duracao_horas)::numeric, 1) AS total_horas
    FROM sessoes_dur
  ),
  registros AS (
    SELECT
      sd.mes,
      r.status
    FROM sessoes_dur sd
    JOIN public.attendance_records r ON r.session_id = sd.session_id
  ),
  mensal AS (
    SELECT
      mes,
      COUNT(*)                                                                   AS total_registros,
      COUNT(*) FILTER (WHERE status IN ('presente','atrasado','justificada'))    AS total_presencas,
      COUNT(*) FILTER (WHERE status = 'falta')                                  AS total_faltas,
      COUNT(*) FILTER (WHERE status = 'atrasado')                               AS total_atrasos,
      COUNT(*) FILTER (WHERE status = 'justificada')                            AS total_justificadas
    FROM registros
    GROUP BY mes
  ),
  anual AS (
    SELECT
      COUNT(*)                                                                   AS total_registros,
      COUNT(*) FILTER (WHERE status IN ('presente','atrasado','justificada'))    AS total_presencas,
      COUNT(*) FILTER (WHERE status = 'falta')                                  AS total_faltas,
      COUNT(*) FILTER (WHERE status = 'atrasado')                               AS total_atrasos,
      COUNT(*) FILTER (WHERE status = 'justificada')                            AS total_justificadas
    FROM registros
  )
  SELECT jsonb_build_object(
    'ano',             NULL,
    'total_aulas_ano', (SELECT total_aulas FROM totais),
    'total_horas_ano', (SELECT total_horas FROM totais),
    'mensal', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'mes',                mes,
            'total_registros',    total_registros,
            'total_presencas',    total_presencas,
            'total_faltas',       total_faltas,
            'total_atrasos',      total_atrasos,
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
        'total_registros',    total_registros,
        'total_presencas',    total_presencas,
        'total_faltas',       total_faltas,
        'total_atrasos',      total_atrasos,
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
