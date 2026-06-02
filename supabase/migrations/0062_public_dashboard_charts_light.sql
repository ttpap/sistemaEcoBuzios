-- public_dashboard_charts (API pública a-pi-eco-buzios): o CTE filtered_students
-- fazia SELECT DISTINCT s.* — arrastava a coluna photo (base64, 30MB) e fazia a
-- RPC levar 8-27s, estourando o fetch do dashboard público => bairros vazios.
-- Agora seleciona só as colunas usadas (id garante DISTINCT por aluno). Imune a foto.

create or replace function public.public_dashboard_charts(p_project_ids uuid[] default null::uuid[])
returns json language plpgsql security definer set search_path to 'public'
as $function$
declare result json;
begin
  with
  active_projects as (
    select id from public.projects
    where finalized_at is null
      and (p_project_ids is null or array_length(p_project_ids, 1) is null or id = any(p_project_ids))
  ),
  filtered_students as (
    select distinct s.id, s.neighborhood, s.school_type, s.school_name, s.school_other, s.birth_date
    from students s
    join class_student_enrollments cse on cse.student_id = s.id and cse.removed_at is null
    join classes c on c.id = cse.class_id
    where c.project_id in (select id from active_projects)
  ),
  neighborhoods as (
    select coalesce(nullif(trim(neighborhood), ''), 'Não informado') as name, count(*) as value
    from filtered_students group by 1 order by value desc limit 12
  ),
  school_types as (
    select
      case
        when school_type in ('municipal', 'state', 'none')
             or lower(coalesce(school_type,'') || ' ' || coalesce(school_name,'') || ' ' || coalesce(school_other,''))
                similar to '%(p[uú]blica|municipal)%'
          then 'Públicas'
        when school_type = 'private'
             or lower(coalesce(school_name,'') || ' ' || coalesce(school_other,''))
                similar to '%(priv|particular)%'
          then 'Privada'
        else 'Outros'
      end as name, count(*) as value
    from filtered_students group by 1
  ),
  age_ranges as (
    select
      case
        when extract(year from age(now(), birth_date)) <= 10 then 'Até 10'
        when extract(year from age(now(), birth_date)) <= 14 then '11 – 14'
        when extract(year from age(now(), birth_date)) <= 17 then '15 – 17'
        when extract(year from age(now(), birth_date)) <= 24 then '18 – 24'
        when extract(year from age(now(), birth_date)) <= 35 then '25 – 35'
        else '36+'
      end as name, count(*) as value
    from filtered_students where birth_date is not null group by 1
  ),
  project_counts as (
    select p.name as name, count(distinct cse.student_id) as value
    from projects p
    join classes c on c.project_id = p.id
    join class_student_enrollments cse on cse.class_id = c.id and cse.removed_at is null
    where p.finalized_at is null
      and (p_project_ids is null or array_length(p_project_ids, 1) is null or p.id = any(p_project_ids))
    group by p.name order by value desc
  )
  select json_build_object(
    'neighborhoods', coalesce((select json_agg(json_build_object('name', name, 'value', value)) from neighborhoods), '[]'::json),
    'schoolTypes',   coalesce((select json_agg(json_build_object('name', name, 'value', value)) from school_types),   '[]'::json),
    'ageRanges',     coalesce((select json_agg(json_build_object('name', name, 'value', value)) from age_ranges),     '[]'::json),
    'projectCounts', coalesce((select json_agg(json_build_object('name', name, 'value', value)) from project_counts), '[]'::json)
  ) into result;
  return result;
end;
$function$;
