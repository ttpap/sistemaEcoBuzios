-- Perfil dos alunos numa data de corte (Dashboard API, ?ate=AAAA-MM-DD).
-- Matrícula conta se estava ativa no dia: enrolled_at <= corte e
-- (sem remoção ou removida depois do corte). Idade calculada no dia do corte.
-- Cada recorte traz "Sem informação" para o total sempre fechar.
-- Gênero e bairro são o valor ATUAL do cadastro (não há histórico desses campos).

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
  result json;
BEGIN
  WITH
  projs AS (
    SELECT id FROM public.projects
    WHERE (finalized_at IS NULL OR finalized_at::date > v_ate)
      AND (p_project_ids IS NULL OR array_length(p_project_ids, 1) IS NULL OR id = ANY(p_project_ids))
  ),
  alunos AS (
    SELECT DISTINCT s.id, s.gender, s.neighborhood, s.birth_date
    FROM public.students s
    JOIN public.class_student_enrollments cse ON cse.student_id = s.id
    JOIN public.classes c ON c.id = cse.class_id
    WHERE c.project_id IN (SELECT id FROM projs)
      AND cse.enrolled_at::date <= v_ate
      AND (cse.removed_at IS NULL OR cse.removed_at::date > v_ate)
  ),
  base AS (
    SELECT id,
      CASE WHEN nullif(trim(gender), '') IS NULL OR trim(gender) = 'Não informado'
           THEN 'Sem informação' ELSE trim(gender) END AS genero,
      CASE WHEN nullif(trim(neighborhood), '') IS NULL OR trim(neighborhood) = 'Não informado'
           THEN 'Sem informação' ELSE trim(neighborhood) END AS bairro,
      CASE
        WHEN birth_date IS NULL OR birth_date > v_ate THEN 'Sem informação'
        WHEN extract(year FROM age(v_ate, birth_date)) <= 10 THEN 'Até 10'
        WHEN extract(year FROM age(v_ate, birth_date)) <= 14 THEN '11 – 14'
        WHEN extract(year FROM age(v_ate, birth_date)) <= 17 THEN '15 – 17'
        WHEN extract(year FROM age(v_ate, birth_date)) <= 24 THEN '18 – 24'
        WHEN extract(year FROM age(v_ate, birth_date)) <= 35 THEN '25 – 35'
        ELSE '36+'
      END AS faixa
    FROM alunos
  ),
  faixas(faixa, ord) AS (
    VALUES ('Até 10',1), ('11 – 14',2), ('15 – 17',3), ('18 – 24',4), ('25 – 35',5), ('36+',6), ('Sem informação',7)
  ),
  generos_lista AS (
    SELECT g.genero, row_number() OVER (ORDER BY
      CASE g.genero WHEN 'Mulher cis' THEN 1 WHEN 'Homem cis' THEN 2 WHEN 'Mulher trans' THEN 3
        WHEN 'Homem trans' THEN 4 WHEN 'Não-binário' THEN 5 WHEN 'Outro' THEN 6
        WHEN 'Sem informação' THEN 99 ELSE 50 END, g.genero) AS ord
    FROM (SELECT DISTINCT genero FROM base UNION SELECT 'Sem informação') g
  ),
  gen_counts AS (
    SELECT gl.genero, gl.ord, (SELECT count(*) FROM base b WHERE b.genero = gl.genero) AS n
    FROM generos_lista gl
  ),
  idade_counts AS (
    SELECT f.faixa, f.ord, (SELECT count(*) FROM base b WHERE b.faixa = f.faixa) AS n
    FROM faixas f
  ),
  bairro_counts AS (
    SELECT bairro, count(*) AS n FROM base GROUP BY bairro
    UNION ALL
    SELECT 'Sem informação', 0 WHERE NOT EXISTS (SELECT 1 FROM base WHERE bairro = 'Sem informação')
  ),
  cruzamento AS (
    SELECT f.faixa, f.ord,
      (SELECT count(*) FROM base b WHERE b.faixa = f.faixa) AS total,
      (SELECT json_object_agg(gl.genero, (SELECT count(*) FROM base b WHERE b.faixa = f.faixa AND b.genero = gl.genero) ORDER BY gl.ord)
         FROM generos_lista gl) AS por_genero
    FROM faixas f
  )
  SELECT json_build_object(
    'data_corte', v_ate,
    'total_alunos', (SELECT count(*) FROM base),
    'generos', (SELECT json_agg(json_build_object('name', genero, 'value', n) ORDER BY ord) FROM gen_counts),
    'idades',  (SELECT json_agg(json_build_object('name', faixa, 'value', n) ORDER BY ord) FROM idade_counts),
    'bairros', (SELECT json_agg(json_build_object('name', bairro, 'value', n)
                ORDER BY (bairro = 'Sem informação'), n DESC, bairro) FROM bairro_counts),
    'generos_por_idade', (SELECT json_agg(
        (json_build_object('faixa', faixa, 'total', total)::jsonb || por_genero::jsonb)::json ORDER BY ord)
      FROM cruzamento)
  ) INTO result;
  RETURN result;
END;
$function$;

REVOKE ALL ON FUNCTION public.public_perfil_stats(uuid[], date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_perfil_stats(uuid[], date) TO service_role;

-- public_gender_stats passa a aceitar a mesma data de corte.
DROP FUNCTION IF EXISTS public.public_gender_stats(uuid[]);

CREATE OR REPLACE FUNCTION public.public_gender_stats(
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
  result json;
BEGIN
  WITH
  active_projects AS (
    SELECT id, name FROM public.projects
    WHERE (finalized_at IS NULL OR finalized_at::date > v_ate)
      AND (p_project_ids IS NULL OR array_length(p_project_ids, 1) IS NULL OR id = ANY(p_project_ids))
  ),
  enrolled AS (
    SELECT DISTINCT c.project_id, s.id AS student_id,
      coalesce(nullif(trim(s.gender), ''), 'Não informado') AS genero
    FROM public.students s
    JOIN public.class_student_enrollments cse ON cse.student_id = s.id
    JOIN public.classes c ON c.id = cse.class_id
    WHERE c.project_id IN (SELECT id FROM active_projects)
      AND cse.enrolled_at::date <= v_ate
      AND (cse.removed_at IS NULL OR cse.removed_at::date > v_ate)
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

REVOKE ALL ON FUNCTION public.public_gender_stats(uuid[], date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_gender_stats(uuid[], date) TO service_role;
