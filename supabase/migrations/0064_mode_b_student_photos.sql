-- Fotos dos alunos na chamada (e demais telas) para Modo B (professor/coordenador,
-- role anon). A RLS de student_photos é "to authenticated", então o anon do Modo B
-- não conseguia ler a foto pelo SELECT direto — a miniatura caía na inicial.
--
-- Esta RPC SECURITY DEFINER devolve as fotos por id, restritas aos alunos
-- matriculados num projeto que o staff (login/senha) pode acessar. Faz o coalesce
-- student_photos.photo -> students.photo (período de migração).

create or replace function public.mode_b_get_student_photos(
  p_login text,
  p_password text,
  p_project_id uuid,
  p_ids uuid[]
)
returns table(student_id uuid, photo text)
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
begin
  if not public.mode_b_staff_can_access_project(p_login, p_password, p_project_id) then
    raise exception 'not_allowed';
  end if;

  return query
    select distinct s.id as student_id, coalesce(sp.photo, s.photo) as photo
    from public.students s
    join public.class_student_enrollments e on e.student_id = s.id
    join public.classes c on c.id = e.class_id
    left join public.student_photos sp on sp.student_id = s.id
    where c.project_id = p_project_id
      and e.removed_at is null
      and s.id = any(p_ids)
      and coalesce(sp.photo, s.photo) is not null;
end;
$function$;

grant execute on function public.mode_b_get_student_photos(text, text, uuid, uuid[]) to anon, authenticated;
