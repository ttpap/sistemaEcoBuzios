-- Distribuição de gênero dos alunos matriculados (Dashboard API).
-- Mesmo escopo de public_dashboard_charts: projetos ativos (não finalizados),
-- filtro opcional por p_project_ids, aluno contado uma vez (DISTINCT).
CREATE OR REPLACE FUNCTION public.public_gender_stats(p_project_ids uuid[] DEFAULT NULL::uuid[])
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE result json;
BEGIN
  WITH
  active_projects AS (
    SELECT id, name FROM public.projects
    WHERE finalized_at IS NULL
      AND (p_project_ids IS NULL OR array_length(p_project_ids, 1) IS NULL OR id = ANY(p_project_ids))
  ),
  enrolled AS (
    SELECT DISTINCT c.project_id, s.id AS student_id,
      coalesce(nullif(trim(s.gender), ''), 'Não informado') AS genero
    FROM public.students s
    JOIN public.class_student_enrollments cse ON cse.student_id = s.id AND cse.removed_at IS NULL
    JOIN public.classes c ON c.id = cse.class_id
    WHERE c.project_id IN (SELECT id FROM active_projects)
  ),
  geral AS (
    SELECT genero AS name, count(DISTINCT student_id) AS value
    FROM enrolled GROUP BY genero
  ),
  por_proj AS (
    SELECT ap.id, ap.name,
      (SELECT count(DISTINCT e.student_id) FROM enrolled e WHERE e.project_id = ap.id) AS total,
      (SELECT coalesce(json_agg(json_build_object('name', g.genero, 'value', g.n) ORDER BY g.n DESC), '[]'::json)
         FROM (SELECT genero, count(DISTINCT student_id) AS n FROM enrolled e WHERE e.project_id = ap.id GROUP BY genero) g
      ) AS generos
    FROM active_projects ap
  )
  SELECT json_build_object(
    'total', (SELECT count(DISTINCT student_id) FROM enrolled),
    'generos', (SELECT coalesce(json_agg(json_build_object('name', name, 'value', value) ORDER BY value DESC), '[]'::json) FROM geral),
    'por_projeto', (SELECT coalesce(json_agg(json_build_object('id', id, 'name', name, 'total', total, 'generos', generos) ORDER BY name), '[]'::json)
                    FROM por_proj WHERE total > 0)
  ) INTO result;
  RETURN result;
END;
$function$;

REVOKE ALL ON FUNCTION public.public_gender_stats(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_gender_stats(uuid[]) TO service_role;
