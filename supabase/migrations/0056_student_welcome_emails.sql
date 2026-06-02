-- Email de boas-vindas ao aluno na primeira matrícula.
-- Estratégia: fila + worker agendado (pg_cron) que respeita o teto diário do
-- Resend (plano grátis 100/dia). O trigger só ENFILEIRA — nunca bloqueia a
-- matrícula. Quem não couber no dia fica 'pending' e é enviado no dia seguinte.

create table if not exists public.student_welcome_emails (
  student_id uuid primary key references public.students(id) on delete cascade,
  status     text not null default 'pending'
             check (status in ('pending','sent','skipped','failed')),
  queued_at  timestamptz not null default now(),
  sent_at    timestamptz,
  attempts   int not null default 0,
  last_error text
);

create index if not exists student_welcome_pending_idx
  on public.student_welcome_emails (status, queued_at)
  where status = 'pending';

alter table public.student_welcome_emails enable row level security;

-- Só admin enxerga a fila pelo cliente; a Edge Function usa service role (ignora RLS).
drop policy if exists welcome_emails_admin_all on public.student_welcome_emails;
create policy welcome_emails_admin_all on public.student_welcome_emails
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Enfileira na PRIMEIRA matrícula do aluno, só se tiver email cadastrado.
-- AFTER INSERT + exceção engolida: jamais derruba a matrícula por causa do email.
create or replace function public.enqueue_student_welcome()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  begin
    if not exists (
      select 1 from public.student_welcome_emails w where w.student_id = NEW.student_id
    ) and exists (
      select 1 from public.students s
      where s.id = NEW.student_id and coalesce(btrim(s.email), '') <> ''
    ) then
      insert into public.student_welcome_emails (student_id, status)
      values (NEW.student_id, 'pending')
      on conflict (student_id) do nothing;
    end if;
  exception when others then
    null; -- nunca bloquear a matrícula
  end;
  return NEW;
end;
$$;

drop trigger if exists trg_enqueue_student_welcome on public.class_student_enrollments;
create trigger trg_enqueue_student_welcome
  after insert on public.class_student_enrollments
  for each row execute function public.enqueue_student_welcome();
