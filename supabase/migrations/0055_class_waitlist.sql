-- Lista de espera por turma (FIFO por ordem de chegada).
-- Quando a turma está lotada, o aluno (já cadastrado em students) entra na fila.
-- Admin/coord/professor gerenciam; chamada e promoção para vaga são manuais.

create table if not exists public.class_waitlist (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid not null references public.classes(id) on delete cascade,
  student_id  uuid not null references public.students(id) on delete cascade,
  created_at  timestamptz not null default now(),  -- ordem FIFO
  status      text not null default 'aguardando'
              check (status in ('aguardando','chamado','matriculado','desistiu')),
  called_at   timestamptz,
  note        text
);

-- Não permite o mesmo aluno duas vezes na fila ATIVA da mesma turma.
-- (matriculado/desistiu liberam para reentrar se precisar.)
create unique index if not exists class_waitlist_active_uq
  on public.class_waitlist (class_id, student_id)
  where status in ('aguardando','chamado');

create index if not exists class_waitlist_class_order_idx
  on public.class_waitlist (class_id, created_at);

alter table public.class_waitlist enable row level security;

-- ===== RLS (espelha class_student_enrollments) =====
drop policy if exists waitlist_admin_all on public.class_waitlist;
create policy waitlist_admin_all on public.class_waitlist
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists waitlist_write_assigned on public.class_waitlist;
create policy waitlist_write_assigned on public.class_waitlist
  for all to authenticated
  using (
    public._project_active(public.project_id_for_class(class_id))
    and (
      public.is_admin()
      or public.is_teacher_assigned_to_project(public.project_id_for_class(class_id))
      or public.is_coordinator_assigned_to_project(public.project_id_for_class(class_id))
    )
  )
  with check (
    public._project_active(public.project_id_for_class(class_id))
    and (
      public.is_admin()
      or public.is_teacher_assigned_to_project(public.project_id_for_class(class_id))
      or public.is_coordinator_assigned_to_project(public.project_id_for_class(class_id))
    )
  );

drop policy if exists waitlist_select_assigned on public.class_waitlist;
create policy waitlist_select_assigned on public.class_waitlist
  for select to authenticated
  using (
    public._project_active(public.project_id_for_class(class_id))
    and (
      public.is_admin()
      or public.is_teacher_assigned_to_project(public.project_id_for_class(class_id))
      or public.is_coordinator_assigned_to_project(public.project_id_for_class(class_id))
    )
  );

-- ===== RPCs Modo B (professor/coordenador com login próprio) =====

create or replace function public.mode_b_add_waitlist(
  p_login text, p_password text, p_class_id uuid, p_student_id uuid
) returns void
language plpgsql security definer set search_path to 'public'
as $$
begin
  if not public.mode_b_staff_can_manage_class(p_login, p_password, p_class_id) then
    raise exception 'not_allowed';
  end if;

  -- já na fila ativa? não duplica.
  if exists (
    select 1 from public.class_waitlist w
    where w.class_id = p_class_id and w.student_id = p_student_id
      and w.status in ('aguardando','chamado')
  ) then
    return;
  end if;

  insert into public.class_waitlist (class_id, student_id)
  values (p_class_id, p_student_id);
end;
$$;

create or replace function public.mode_b_list_waitlist(
  p_login text, p_password text, p_class_id uuid
) returns table (
  id uuid, class_id uuid, student_id uuid, created_at timestamptz,
  status text, called_at timestamptz, note text,
  full_name text, social_name text, email text, cell_phone text,
  birth_date date, age integer
)
language plpgsql security definer set search_path to 'public'
as $$
begin
  if not public.mode_b_staff_can_manage_class(p_login, p_password, p_class_id) then
    raise exception 'not_allowed';
  end if;

  return query
    select w.id, w.class_id, w.student_id, w.created_at,
           w.status, w.called_at, w.note,
           s.full_name, s.social_name, s.email, s.cell_phone,
           s.birth_date, s.age
    from public.class_waitlist w
    join public.students s on s.id = w.student_id
    where w.class_id = p_class_id
    order by w.created_at asc;
end;
$$;

create or replace function public.mode_b_update_waitlist_status(
  p_login text, p_password text, p_waitlist_id uuid, p_status text
) returns void
language plpgsql security definer set search_path to 'public'
as $$
declare v_class uuid;
begin
  select class_id into v_class from public.class_waitlist where id = p_waitlist_id;
  if v_class is null then raise exception 'not_found'; end if;
  if not public.mode_b_staff_can_manage_class(p_login, p_password, v_class) then
    raise exception 'not_allowed';
  end if;
  if p_status not in ('aguardando','chamado','matriculado','desistiu') then
    raise exception 'invalid_status';
  end if;

  update public.class_waitlist
  set status = p_status,
      called_at = case when p_status = 'chamado' then now() else called_at end
  where id = p_waitlist_id;
end;
$$;

create or replace function public.mode_b_remove_waitlist(
  p_login text, p_password text, p_waitlist_id uuid
) returns void
language plpgsql security definer set search_path to 'public'
as $$
declare v_class uuid;
begin
  select class_id into v_class from public.class_waitlist where id = p_waitlist_id;
  if v_class is null then return; end if;
  if not public.mode_b_staff_can_manage_class(p_login, p_password, v_class) then
    raise exception 'not_allowed';
  end if;

  delete from public.class_waitlist where id = p_waitlist_id;
end;
$$;

-- Promove para vaga: cria matrícula (ou reativa) e marca a fila como matriculado.
create or replace function public.mode_b_promote_waitlist(
  p_login text, p_password text, p_waitlist_id uuid
) returns void
language plpgsql security definer set search_path to 'public'
as $$
declare v_class uuid; v_student uuid;
begin
  select class_id, student_id into v_class, v_student
  from public.class_waitlist where id = p_waitlist_id;
  if v_class is null then raise exception 'not_found'; end if;
  if not public.mode_b_staff_can_manage_class(p_login, p_password, v_class) then
    raise exception 'not_allowed';
  end if;

  if exists (
    select 1 from public.class_student_enrollments e
    where e.class_id = v_class and e.student_id = v_student
  ) then
    update public.class_student_enrollments
    set removed_at = null
    where class_id = v_class and student_id = v_student;
  else
    insert into public.class_student_enrollments (class_id, student_id, enrolled_at, removed_at)
    values (v_class, v_student, now(), null);
  end if;

  update public.class_waitlist set status = 'matriculado' where id = p_waitlist_id;
end;
$$;
