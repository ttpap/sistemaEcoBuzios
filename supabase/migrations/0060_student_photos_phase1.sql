-- Plano B (parte 1): tira as fotos (base64, ~30MB) de students.photo para uma
-- tabela separada student_photos, deixando students leve (corrige os timeouts
-- intermitentes que derrubavam login admin / listas).
-- FASE 1: cria a tabela, copia os dados e aponta a RPC do dashboard do aluno.
-- (O zeramento de students.photo é a FASE 3 / migration 0061, após o deploy do
--  código que lê de student_photos.)

create table if not exists public.student_photos (
  student_id uuid primary key references public.students(id) on delete cascade,
  photo      text not null,
  updated_at timestamptz not null default now()
);

alter table public.student_photos enable row level security;

drop policy if exists student_photos_admin_all on public.student_photos;
create policy student_photos_admin_all on public.student_photos
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists student_photos_select_assigned on public.student_photos;
create policy student_photos_select_assigned on public.student_photos
  for select to authenticated
  using (
    public.is_admin()
    or (student_id = public.current_student_id())
    or exists (
      select 1 from public.class_student_enrollments e
      join public.classes c on c.id = e.class_id
      where e.student_id = student_photos.student_id
        and (public.is_teacher_assigned_to_project(c.project_id)
             or public.is_coordinator_assigned_to_project(c.project_id))
    )
  );

insert into public.student_photos(student_id, photo)
select id, photo from public.students
where photo is not null and photo <> ''
on conflict (student_id) do nothing;

create or replace function public.mode_b_get_student_profile(p_student_id uuid)
returns setof students language plpgsql security definer set search_path to 'public'
as $function$
begin
  if not exists (select 1 from public.students where id = p_student_id) then
    return;
  end if;
  return query
    select s.id, s.registration, s.full_name, s.social_name, s.email, s.cpf, s.birth_date, s.age, s.cell_phone, s.gender, s.race, coalesce(sp.photo, s.photo) AS photo, s.guardian_name, s.guardian_kinship, s.guardian_phone, s.school_type, s.school_name, s.school_other, s.cep, s.street, s.number, s.complement, s.neighborhood, s.city, s.uf, s.enel_client_number, s.blood_type, s.has_allergy, s.allergy_detail, s.has_special_needs, s.special_needs_detail, s.uses_medication, s.medication_detail, s.has_physical_restriction, s.physical_restriction_detail, s.practiced_activity, s.practiced_activity_detail, s.family_heart_history, s.health_problems, s.health_problems_other, s.observations, s.image_authorization, s.docs_delivered, s.registration_date, s.status, s.class, s.guardian_declaration_confirmed, s.auth_password, s.family_heart_history_detail
    from public.students s
    left join public.student_photos sp on sp.student_id = s.id
    where s.id = p_student_id;
end;
$function$;
