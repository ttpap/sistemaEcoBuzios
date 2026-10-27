-- Disk IO: public_perfil_stats criava/truncava/populava uma tabela temporária a cada chamada
-- (escrita em catálogo + WAL). Mesma lógica de negócio, agora com CTEs em memória.
-- Validado em 2026-10-27: saída byte-idêntica (md5) à versão anterior em 7 combinações de parâmetros.
-- Rollback: supabase/rollback/2026-10-27_disk_io_rollback.sql
CREATE OR REPLACE FUNCTION public.public_perfil_stats(p_project_ids uuid[] DEFAULT NULL::uuid[], p_ate date DEFAULT NULL::date)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_ate date := coalesce(p_ate, current_date);
  v_projetos uuid[];
  v_ids uuid[];
  v_geral jsonb;
  v_por_projeto jsonb;
  v_soma int;
BEGIN
  SELECT coalesce(array_agg(p.id), '{}') INTO v_projetos
  FROM public.projects p
  WHERE (p.finalized_at IS NULL OR p.finalized_at::date > v_ate)
    AND (p_project_ids IS NULL OR array_length(p_project_ids, 1) IS NULL OR p.id = ANY(p_project_ids));

  WITH mat AS (
    SELECT DISTINCT c.project_id, cse.student_id
    FROM public.class_student_enrollments cse
    JOIN public.classes c ON c.id = cse.class_id
    WHERE c.project_id = ANY(v_projetos)
      AND cse.enrolled_at::date <= v_ate
      AND (cse.removed_at IS NULL OR cse.removed_at::date > v_ate)
  )
  SELECT coalesce(array_agg(DISTINCT student_id), '{}') INTO v_ids FROM mat;

  v_geral := public.perfil_recortes(v_ids, v_ate)
    || jsonb_build_object('saidas_por_mes', public.movimento_mensal(v_projetos, v_ate));

  WITH mat AS (
    SELECT DISTINCT c.project_id, cse.student_id
    FROM public.class_student_enrollments cse
    JOIN public.classes c ON c.id = cse.class_id
    WHERE c.project_id = ANY(v_projetos)
      AND cse.enrolled_at::date <= v_ate
      AND (cse.removed_at IS NULL OR cse.removed_at::date > v_ate)
  )
  SELECT coalesce(jsonb_agg(
           jsonb_build_object('id', p.id, 'name', p.name, 'value', x.n)
           || public.perfil_recortes(x.ids, v_ate)
           || jsonb_build_object('saidas_por_mes', public.movimento_mensal(ARRAY[p.id], v_ate))
           ORDER BY x.n DESC, p.name), '[]'::jsonb),
         coalesce(sum(x.n), 0)
    INTO v_por_projeto, v_soma
  FROM (SELECT project_id, count(*)::int AS n, array_agg(student_id) AS ids
        FROM mat GROUP BY project_id) x
  JOIN public.projects p ON p.id = x.project_id;

  RETURN (jsonb_build_object(
    'data_corte', v_ate,
    'alunos_unicos', (v_geral->>'total_alunos')::int,
    'total_matriculas_por_projeto', v_soma
  ) || v_geral || jsonb_build_object('por_projeto', v_por_projeto))::json;
END;
$function$;
