-- Correção de outage: coordenador/professor (Modo B, role anon, statement_timeout=3s)
-- não conseguia carregar a lista de alunos para matrícula — "nenhum aluno aparece".
-- Causa: as RPCs mode_b_list_* faziam SELECT * em students, trazendo a coluna photo
-- (base64, ~30 MB no total) e estourando o timeout de 3s do anon.
--
-- Fix: as RPCs continuam RETURNS SETOF students (cliente intacto via mapStudentRowToModel),
-- mas a coluna photo é retornada como NULL — elimina os 30 MB. A miniatura passa a ser
-- carregada sob demanda (StudentAvatar) onde houver caminho; em Modo B (anon) cai no
-- fallback de inicial até criarmos um RPC leve de fotos por id.

create or replace function public.mode_b_list_all_students(p_login text, p_password text, p_project_id uuid)
returns setof students language plpgsql security definer set search_path to 'public'
as $function$
begin
  if not public.mode_b_staff_can_access_project(p_login, p_password, p_project_id) then
    raise exception 'not_allowed';
  end if;
  return query
    select s.id, s.registration, s.full_name, s.social_name, s.email, s.cpf, s.birth_date, s.age, s.cell_phone, s.gender, s.race, NULL::text AS photo, s.guardian_name, s.guardian_kinship, s.guardian_phone, s.school_type, s.school_name, s.school_other, s.cep, s.street, s.number, s.complement, s.neighborhood, s.city, s.uf, s.enel_client_number, s.blood_type, s.has_allergy, s.allergy_detail, s.has_special_needs, s.special_needs_detail, s.uses_medication, s.medication_detail, s.has_physical_restriction, s.physical_restriction_detail, s.practiced_activity, s.practiced_activity_detail, s.family_heart_history, s.health_problems, s.health_problems_other, s.observations, s.image_authorization, s.docs_delivered, s.registration_date, s.status, s.class, s.guardian_declaration_confirmed, s.auth_password, s.family_heart_history_detail
    from public.students s
    order by s.registration_date desc;
end;
$function$;

create or replace function public.mode_b_list_students(p_login text, p_password text, p_project_id uuid)
returns setof students language plpgsql security definer set search_path to 'public'
as $function$
begin
  if not public.mode_b_staff_can_access_project(p_login, p_password, p_project_id) then
    raise exception 'not_allowed';
  end if;
  return query
    select distinct s.id, s.registration, s.full_name, s.social_name, s.email, s.cpf, s.birth_date, s.age, s.cell_phone, s.gender, s.race, NULL::text AS photo, s.guardian_name, s.guardian_kinship, s.guardian_phone, s.school_type, s.school_name, s.school_other, s.cep, s.street, s.number, s.complement, s.neighborhood, s.city, s.uf, s.enel_client_number, s.blood_type, s.has_allergy, s.allergy_detail, s.has_special_needs, s.special_needs_detail, s.uses_medication, s.medication_detail, s.has_physical_restriction, s.physical_restriction_detail, s.practiced_activity, s.practiced_activity_detail, s.family_heart_history, s.health_problems, s.health_problems_other, s.observations, s.image_authorization, s.docs_delivered, s.registration_date, s.status, s.class, s.guardian_declaration_confirmed, s.auth_password, s.family_heart_history_detail
    from public.students s
    join public.class_student_enrollments cse on cse.student_id = s.id
    join public.classes c on c.id = cse.class_id
    where c.project_id = p_project_id and cse.removed_at is null
    order by s.registration_date desc;
end;
$function$;

create or replace function public.mode_b_list_class_students(p_login text, p_password text, p_class_id uuid)
returns setof students language plpgsql security definer set search_path to 'public'
as $function$
begin
  if not public.mode_b_staff_can_manage_class(p_login, p_password, p_class_id) then
    raise exception 'not_allowed';
  end if;
  return query
    select s.id, s.registration, s.full_name, s.social_name, s.email, s.cpf, s.birth_date, s.age, s.cell_phone, s.gender, s.race, NULL::text AS photo, s.guardian_name, s.guardian_kinship, s.guardian_phone, s.school_type, s.school_name, s.school_other, s.cep, s.street, s.number, s.complement, s.neighborhood, s.city, s.uf, s.enel_client_number, s.blood_type, s.has_allergy, s.allergy_detail, s.has_special_needs, s.special_needs_detail, s.uses_medication, s.medication_detail, s.has_physical_restriction, s.physical_restriction_detail, s.practiced_activity, s.practiced_activity_detail, s.family_heart_history, s.health_problems, s.health_problems_other, s.observations, s.image_authorization, s.docs_delivered, s.registration_date, s.status, s.class, s.guardian_declaration_confirmed, s.auth_password, s.family_heart_history_detail
    from public.class_student_enrollments e
    join public.students s on s.id = e.student_id
    where e.class_id = p_class_id and e.removed_at is null
    order by s.full_name asc;
end;
$function$;
