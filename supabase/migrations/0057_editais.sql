-- Registro de Editais (área do administrador).
-- O admin registra os editais em que se inscreveu e marca o resultado
-- (inscrito / aprovado / reprovado). Acesso exclusivo do administrador.

create table if not exists public.editais (
  id uuid primary key default gen_random_uuid(),
  title text not null,                 -- nome do edital
  agency text,                         -- órgão / instituição
  notice_number text,                  -- número do edital
  url text,                            -- link do edital
  amount numeric,                      -- valor pleiteado
  submission_date date,                -- data da inscrição
  result_date date,                    -- data do resultado
  status text not null default 'inscrito',  -- inscrito | aprovado | reprovado
  notes text,                          -- observações
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists editais_status_idx on public.editais(status);
create index if not exists editais_submission_date_idx on public.editais(submission_date);

alter table public.editais enable row level security;

-- Apenas administradores (Supabase Auth com profile role = 'admin').
-- Coordenadores/professores (Mode B via anon) NÃO têm acesso.
create policy "admin_all_editais"
  on public.editais
  for all
  to authenticated
  using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'admin'));
