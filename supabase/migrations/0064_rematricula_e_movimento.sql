-- Rematrícula cria matrícula NOVA (novo enrolled_at) e preserva a antiga com
-- o removed_at dela. Presença é ligada a aluno + aula (attendance_records),
-- não à matrícula, então o histórico de frequência não se divide.
-- Também: saídas só fecham a matrícula ativa (antes sobrescreviam o
-- removed_at de matrículas antigas) e a API ganha entradas/saídas por mês.

CREATE OR REPLACE FUNCTION public.mode_b_enroll_student(p_login text, p_password text, p_class_id uuid, p_student_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.mode_b_staff_can_manage_class(p_login, p_password, p_class_id) THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;

  -- Evita matrícula ativa duplicada em clique duplo.
  PERFORM pg_advisory_xact_lock(hashtext(p_class_id::text || p_student_id::text));

  IF EXISTS (
    SELECT 1 FROM public.class_student_enrollments e
    WHERE e.class_id = p_class_id AND e.student_id = p_student_id AND e.removed_at IS NULL
  ) THEN
    RETURN;
  END IF;

  INSERT INTO public.class_student_enrollments (class_id, student_id, enrolled_at, removed_at)
  VALUES (p_class_id, p_student_id, now(), NULL);
END;
$function$;

CREATE OR REPLACE FUNCTION public.mode_b_promote_waitlist(p_login text, p_password text, p_waitlist_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_class uuid; v_student uuid;
BEGIN
  SELECT class_id, student_id INTO v_class, v_student
  FROM public.class_waitlist WHERE id = p_waitlist_id;
  IF v_class IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;
  IF NOT public.mode_b_staff_can_manage_class(p_login, p_password, v_class) THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(v_class::text || v_student::text));

  IF NOT EXISTS (
    SELECT 1 FROM public.class_student_enrollments e
    WHERE e.class_id = v_class AND e.student_id = v_student AND e.removed_at IS NULL
  ) THEN
    INSERT INTO public.class_student_enrollments (class_id, student_id, enrolled_at, removed_at)
    VALUES (v_class, v_student, now(), NULL);
  END IF;

  UPDATE public.class_waitlist SET status = 'matriculado' WHERE id = p_waitlist_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.mode_b_remove_student_enrollment(p_login text, p_password text, p_class_id uuid, p_student_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.mode_b_staff_can_manage_class(p_login, p_password, p_class_id) THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;

  UPDATE public.class_student_enrollments
  SET removed_at = now()
  WHERE class_id = p_class_id
    AND student_id = p_student_id
    AND removed_at IS NULL;
END;
$function$;

-- Entradas, saídas e ativos por mês num conjunto de projetos, até a data de corte.
-- Nível aluno: matrículas sobrepostas/encostadas (troca de turma, rematrícula no
-- mesmo dia, linha duplicada) viram um período só; entrada = início do período,
-- saída = fim do período. Ativo no dia = mesma regra do perfil
-- (enrolled_at <= dia e sem saída ou saída depois do dia).
CREATE OR REPLACE FUNCTION public.movimento_mensal(p_project_ids uuid[], p_ate date)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH iv AS (
    SELECT cse.student_id,
      cse.enrolled_at::date AS ini,
      CASE WHEN cse.removed_at IS NOT NULL AND cse.removed_at::date <= p_ate
           THEN cse.removed_at::date END AS fim
    FROM public.class_student_enrollments cse
    JOIN public.classes c ON c.id = cse.class_id
    WHERE c.project_id = ANY(p_project_ids)
      AND cse.enrolled_at::date <= p_ate
  ),
  ord AS (
    SELECT *,
      max(coalesce(fim, 'infinity'::date)) OVER (
        PARTITION BY student_id ORDER BY ini, coalesce(fim, 'infinity'::date)
        ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) AS fim_anterior
    FROM iv
  ),
  grp AS (
    SELECT *,
      sum(CASE WHEN fim_anterior IS NULL OR ini > fim_anterior THEN 1 ELSE 0 END) OVER (
        PARTITION BY student_id ORDER BY ini, coalesce(fim, 'infinity'::date)) AS ilha
    FROM ord
  ),
  periodos AS (
    SELECT student_id, min(ini) AS ini,
      CASE WHEN bool_or(fim IS NULL) THEN NULL ELSE max(fim) END AS fim
    FROM grp GROUP BY student_id, ilha
  ),
  meses AS (
    SELECT m::date AS m, least((m + interval '1 month - 1 day')::date, p_ate) AS ref
    FROM generate_series(date_trunc('month', (SELECT min(ini) FROM periodos)),
                         date_trunc('month', p_ate), interval '1 month') AS m
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object(
      'mes', to_char(me.m, 'YYYY-MM'),
      'entradas', (SELECT count(*) FROM periodos p WHERE date_trunc('month', p.ini) = me.m),
      'saidas', (SELECT count(*) FROM periodos p WHERE p.fim IS NOT NULL AND date_trunc('month', p.fim) = me.m),
      'ativos_fim_mes', (SELECT count(DISTINCT p.student_id) FROM periodos p
                          WHERE p.ini <= me.ref AND (p.fim IS NULL OR p.fim > me.ref))
    ) ORDER BY me.m), '[]'::jsonb)
  FROM meses me;
$function$;

REVOKE ALL ON FUNCTION public.movimento_mensal(uuid[], date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.movimento_mensal(uuid[], date) TO service_role;

-- public_perfil_stats passa a trazer saidas_por_mes no geral e em cada projeto.
CREATE OR REPLACE FUNCTION public.public_perfil_stats(
  p_project_ids uuid[] DEFAULT NULL::uuid[],
  p_ate date DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_ate date := coalesce(p_ate, current_date);
  v_projetos uuid[];
  v_geral jsonb;
  v_por_projeto jsonb;
  v_soma int;
BEGIN
  SELECT coalesce(array_agg(p.id), '{}') INTO v_projetos
  FROM public.projects p
  WHERE (p.finalized_at IS NULL OR p.finalized_at::date > v_ate)
    AND (p_project_ids IS NULL OR array_length(p_project_ids, 1) IS NULL OR p.id = ANY(p_project_ids));

  CREATE TEMP TABLE IF NOT EXISTS _perfil_matriculas (project_id uuid, student_id uuid) ON COMMIT DROP;
  TRUNCATE _perfil_matriculas;

  INSERT INTO _perfil_matriculas
  SELECT DISTINCT c.project_id, cse.student_id
  FROM public.class_student_enrollments cse
  JOIN public.classes c ON c.id = cse.class_id
  WHERE c.project_id = ANY(v_projetos)
    AND cse.enrolled_at::date <= v_ate
    AND (cse.removed_at IS NULL OR cse.removed_at::date > v_ate);

  v_geral := public.perfil_recortes(
    (SELECT coalesce(array_agg(DISTINCT student_id), '{}') FROM _perfil_matriculas), v_ate)
    || jsonb_build_object('saidas_por_mes', public.movimento_mensal(v_projetos, v_ate));

  SELECT coalesce(jsonb_agg(
           jsonb_build_object('id', p.id, 'name', p.name, 'value', x.n)
           || public.perfil_recortes(x.ids, v_ate)
           || jsonb_build_object('saidas_por_mes', public.movimento_mensal(ARRAY[p.id], v_ate))
           ORDER BY x.n DESC, p.name), '[]'::jsonb),
         coalesce(sum(x.n), 0)
    INTO v_por_projeto, v_soma
  FROM (SELECT project_id, count(*)::int AS n, array_agg(student_id) AS ids
        FROM _perfil_matriculas GROUP BY project_id) x
  JOIN public.projects p ON p.id = x.project_id;

  RETURN (jsonb_build_object(
    'data_corte', v_ate,
    'alunos_unicos', (v_geral->>'total_alunos')::int,
    'total_matriculas_por_projeto', v_soma
  ) || v_geral || jsonb_build_object('por_projeto', v_por_projeto))::json;
END;
$function$;

REVOKE ALL ON FUNCTION public.public_perfil_stats(uuid[], date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_perfil_stats(uuid[], date) TO service_role;
