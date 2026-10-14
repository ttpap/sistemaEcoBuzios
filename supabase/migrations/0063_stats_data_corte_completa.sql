-- Dashboard API: data de corte em todos os recortes, escolaridade, bairros em
-- lista fechada e alunos_unicos. Todo recorte soma o total do filtro e sempre
-- traz a linha "Sem informação".

-- Bairro canônico (lista fechada). Grafias/variações conhecidas são mapeadas;
-- vazio ou inválido = "Sem informação"; fora de Búzios = "Outro bairro".
CREATE OR REPLACE FUNCTION public.normalize_bairro(p_bairro text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $function$
  WITH k AS (
    SELECT lower(translate(trim(coalesce(p_bairro, '')),
      'áàâãéêíóôõúüçÁÀÂÃÉÊÍÓÔÕÚÜÇ', 'aaaaeeiooouucAAAAEEIOOOUUC')) AS v
  ),
  canon(nome) AS (VALUES
    ('Alto de Búzios'), ('Armação'), ('Arpoador'), ('Baía Formosa'), ('Bosque de Geribá'),
    ('Brava'), ('Caminho de Búzios'), ('Capão'), ('Caravelas'), ('Cem Braças'), ('Centro'),
    ('Cruzeiro'), ('Ferradura'), ('Forno'), ('Geribá'), ('Golfe'), ('João Fernandes'),
    ('José Gonçalves'), ('Manguinhos'), ('Maria Joaquina'), ('Marina'), ('Ossos'),
    ('Portal da Ferradura'), ('Praia Rasa'), ('Rasa'), ('São José'), ('Tartaruga'),
    ('Tucuns'), ('Vila Caranga'), ('Vila Verde'), ('Outro bairro'), ('Sem informação')
  )
  SELECT coalesce(
    (SELECT c.nome FROM canon c, k
      WHERE lower(translate(c.nome, 'áàâãéêíóôõúüçÁÀÂÃÉÊÍÓÔÕÚÜÇ', 'aaaaeeiooouucAAAAEEIOOOUUC')) = k.v),
    (SELECT CASE
       WHEN k.v LIKE 'maria joaquina%' THEN 'Maria Joaquina'
       WHEN k.v LIKE 'centro (%' THEN 'Centro'
       WHEN k.v IN ('alto da rasa', 'rasa - alto da boa vista') THEN 'Rasa'
       WHEN k.v = 'outro' THEN 'Outro bairro'
       WHEN k.v IN ('jacarepagua', 'jardim esperanca', 'ogiva', 'palmeiras', 'passagem',
                    'santo cristo', 'sambura (tamoios)', 'unamar (tamoios)') THEN 'Outro bairro'
       ELSE 'Sem informação'
     END FROM k)
  );
$function$;

-- Recortes de perfil de um conjunto de alunos numa data de corte.
CREATE OR REPLACE FUNCTION public.perfil_recortes(p_student_ids uuid[], p_ate date)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
BEGIN
  WITH
  base AS (
    SELECT s.id,
      CASE WHEN nullif(trim(s.gender), '') IS NULL OR trim(s.gender) = 'Não informado'
           THEN 'Sem informação' ELSE trim(s.gender) END AS genero,
      public.normalize_bairro(s.neighborhood) AS bairro,
      coalesce(nullif(trim(s.education_level), ''), 'Sem informação') AS escolaridade,
      CASE
        WHEN s.birth_date IS NULL OR s.birth_date > p_ate THEN 'Sem informação'
        WHEN extract(year FROM age(p_ate, s.birth_date)) <= 10 THEN 'Até 10'
        WHEN extract(year FROM age(p_ate, s.birth_date)) <= 14 THEN '11 – 14'
        WHEN extract(year FROM age(p_ate, s.birth_date)) <= 17 THEN '15 – 17'
        WHEN extract(year FROM age(p_ate, s.birth_date)) <= 24 THEN '18 – 24'
        WHEN extract(year FROM age(p_ate, s.birth_date)) <= 35 THEN '25 – 35'
        ELSE '36+'
      END AS faixa,
      CASE
        WHEN nullif(trim(coalesce(s.school_type, '') || coalesce(s.school_name, '') || coalesce(s.school_other, '')), '') IS NULL
          THEN 'Sem informação'
        WHEN s.school_type IN ('municipal', 'state', 'none')
             OR lower(coalesce(s.school_type,'') || ' ' || coalesce(s.school_name,'') || ' ' || coalesce(s.school_other,''))
                SIMILAR TO '%(p[uú]blica|municipal)%'
          THEN 'Públicas'
        WHEN s.school_type = 'private'
             OR lower(coalesce(s.school_name,'') || ' ' || coalesce(s.school_other,'')) SIMILAR TO '%(priv|particular)%'
          THEN 'Privada'
        ELSE 'Outros'
      END AS instituicao
    FROM public.students s
    WHERE s.id = ANY(p_student_ids)
  ),
  faixas(nome, ord) AS (
    VALUES ('Até 10',1), ('11 – 14',2), ('15 – 17',3), ('18 – 24',4), ('25 – 35',5), ('36+',6), ('Sem informação',7)
  ),
  escolaridades(nome, ord) AS (
    VALUES ('Não alfabetizado',1), ('Fundamental incompleto',2), ('Fundamental completo',3),
           ('Médio incompleto',4), ('Médio completo',5), ('Superior incompleto',6),
           ('Superior completo',7), ('Sem informação',8)
  ),
  instituicoes(nome, ord) AS (
    VALUES ('Públicas',1), ('Privada',2), ('Outros',3), ('Sem informação',4)
  ),
  -- Gêneros fixos sempre presentes (mesmo com 0) + qualquer outro valor encontrado.
  generos(nome, ord) AS (
    SELECT nome, ord FROM (VALUES ('Mulher cis',1), ('Homem cis',2), ('Mulher trans',3), ('Homem trans',4),
                                  ('Não-binário',5), ('Outro',6), ('Sem informação',99)) g(nome, ord)
    UNION
    SELECT DISTINCT genero, 50 FROM base
    WHERE genero NOT IN ('Mulher cis','Homem cis','Mulher trans','Homem trans','Não-binário','Outro','Sem informação')
  ),
  bairros AS (
    SELECT bairro AS nome, count(*) AS n FROM base GROUP BY bairro
    UNION ALL
    SELECT 'Sem informação', 0 WHERE NOT EXISTS (SELECT 1 FROM base WHERE bairro = 'Sem informação')
  )
  SELECT jsonb_build_object(
    'total_alunos', (SELECT count(*) FROM base),
    'generos', (SELECT jsonb_agg(jsonb_build_object('name', g.nome, 'value',
                  (SELECT count(*) FROM base b WHERE b.genero = g.nome)) ORDER BY g.ord, g.nome) FROM generos g),
    'idades', (SELECT jsonb_agg(jsonb_build_object('name', f.nome, 'value',
                  (SELECT count(*) FROM base b WHERE b.faixa = f.nome)) ORDER BY f.ord) FROM faixas f),
    'bairros', (SELECT jsonb_agg(jsonb_build_object('name', nome, 'value', n)
                  ORDER BY (nome = 'Sem informação'), (nome = 'Outro bairro'), n DESC, nome) FROM bairros),
    'instituicao', (SELECT jsonb_agg(jsonb_build_object('name', i.nome, 'value',
                  (SELECT count(*) FROM base b WHERE b.instituicao = i.nome)) ORDER BY i.ord) FROM instituicoes i),
    'escolaridade', (SELECT jsonb_agg(jsonb_build_object('name', e.nome, 'value',
                  (SELECT count(*) FROM base b WHERE b.escolaridade = e.nome)) ORDER BY e.ord) FROM escolaridades e),
    'generos_por_idade', (SELECT jsonb_agg(
        jsonb_build_object('faixa', f.nome, 'total', (SELECT count(*) FROM base b WHERE b.faixa = f.nome))
        || (SELECT jsonb_object_agg(g.nome, (SELECT count(*) FROM base b WHERE b.faixa = f.nome AND b.genero = g.nome)) FROM generos g)
        ORDER BY f.ord) FROM faixas f),
    'generos_por_escolaridade', (SELECT jsonb_agg(
        jsonb_build_object('escolaridade', e.nome, 'total', (SELECT count(*) FROM base b WHERE b.escolaridade = e.nome))
        || (SELECT jsonb_object_agg(g.nome, (SELECT count(*) FROM base b WHERE b.escolaridade = e.nome AND b.genero = g.nome)) FROM generos g)
        ORDER BY e.ord) FROM escolaridades e)
  ) INTO result;
  RETURN result;
END;
$function$;

REVOKE ALL ON FUNCTION public.perfil_recortes(uuid[], date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.perfil_recortes(uuid[], date) TO service_role;

-- Perfil geral (alunos únicos) + perfil por projeto, na data de corte.
-- Matrícula conta se ativa no dia: enrolled_at <= corte e (sem remoção ou removida depois).
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
  v_geral jsonb;
  v_por_projeto jsonb;
  v_soma int;
BEGIN
  CREATE TEMP TABLE IF NOT EXISTS _perfil_matriculas (project_id uuid, student_id uuid) ON COMMIT DROP;
  TRUNCATE _perfil_matriculas;

  INSERT INTO _perfil_matriculas
  SELECT DISTINCT c.project_id, cse.student_id
  FROM public.class_student_enrollments cse
  JOIN public.classes c ON c.id = cse.class_id
  JOIN public.projects p ON p.id = c.project_id
  WHERE (p.finalized_at IS NULL OR p.finalized_at::date > v_ate)
    AND (p_project_ids IS NULL OR array_length(p_project_ids, 1) IS NULL OR p.id = ANY(p_project_ids))
    AND cse.enrolled_at::date <= v_ate
    AND (cse.removed_at IS NULL OR cse.removed_at::date > v_ate);

  v_geral := public.perfil_recortes(
    (SELECT coalesce(array_agg(DISTINCT student_id), '{}') FROM _perfil_matriculas), v_ate);

  SELECT coalesce(jsonb_agg(
           jsonb_build_object('id', p.id, 'name', p.name, 'value', x.n)
           || public.perfil_recortes(x.ids, v_ate)
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

-- Frequência só com aulas até a data de corte.
DROP FUNCTION IF EXISTS public.public_attendance_stats(uuid[]);

CREATE OR REPLACE FUNCTION public.public_attendance_stats(
  p_project_ids uuid[] DEFAULT NULL::uuid[],
  p_ate date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
      AND (p_ate IS NULL OR s.date <= p_ate)
  ),
  totais AS (
    SELECT COUNT(*)::int AS total_aulas, ROUND(SUM(duracao_horas)::numeric, 1) AS total_horas
    FROM sessoes_dur
  ),
  registros AS (
    SELECT sd.mes, r.status
    FROM sessoes_dur sd
    JOIN public.attendance_records r ON r.session_id = sd.session_id
  ),
  mensal AS (
    SELECT mes,
      COUNT(*) AS total_registros,
      COUNT(*) FILTER (WHERE status IN ('presente','atrasado','justificada')) AS total_presencas,
      COUNT(*) FILTER (WHERE status = 'falta') AS total_faltas,
      COUNT(*) FILTER (WHERE status = 'atrasado') AS total_atrasos,
      COUNT(*) FILTER (WHERE status = 'justificada') AS total_justificadas
    FROM registros GROUP BY mes
  ),
  anual AS (
    SELECT
      COUNT(*) AS total_registros,
      COUNT(*) FILTER (WHERE status IN ('presente','atrasado','justificada')) AS total_presencas,
      COUNT(*) FILTER (WHERE status = 'falta') AS total_faltas,
      COUNT(*) FILTER (WHERE status = 'atrasado') AS total_atrasos,
      COUNT(*) FILTER (WHERE status = 'justificada') AS total_justificadas
    FROM registros
  )
  SELECT jsonb_build_object(
    'ano', NULL,
    'data_corte', p_ate,
    'total_aulas_ano', (SELECT total_aulas FROM totais),
    'total_horas_ano', (SELECT total_horas FROM totais),
    'mensal', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'mes', mes,
        'total_registros', total_registros,
        'total_presencas', total_presencas,
        'total_faltas', total_faltas,
        'total_atrasos', total_atrasos,
        'total_justificadas', total_justificadas,
        'percentual_presenca', CASE WHEN total_registros > 0
          THEN round((total_presencas::numeric / total_registros) * 100, 1) ELSE 0 END
      ) ORDER BY mes) FROM mensal), '[]'::jsonb),
    'anual', (SELECT jsonb_build_object(
        'total_registros', total_registros,
        'total_presencas', total_presencas,
        'total_faltas', total_faltas,
        'total_atrasos', total_atrasos,
        'total_justificadas', total_justificadas,
        'percentual_presenca', CASE WHEN total_registros > 0
          THEN round((total_presencas::numeric / total_registros) * 100, 1) ELSE 0 END
      ) FROM anual)
  ) INTO v_result;

  RETURN v_result;
END;
$function$;

REVOKE ALL ON FUNCTION public.public_attendance_stats(uuid[], date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_attendance_stats(uuid[], date) TO service_role;
