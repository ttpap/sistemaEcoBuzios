-- Tabela de Atas de Reunião
create table if not exists meeting_minutes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  meeting_date date not null,
  location text,
  participants text,
  agenda text,
  raw_notes text,
  organized_content text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Índice para busca por projeto
create index if not exists meeting_minutes_project_id_idx on meeting_minutes(project_id);

-- RLS
alter table meeting_minutes enable row level security;

-- Admin (Supabase Auth) pode tudo
create policy "admin_all_meeting_minutes"
  on meeting_minutes
  for all
  to authenticated
  using (true)
  with check (true);

-- Coordenadores e professores (Mode B usam role anon) podem tudo
create policy "anon_all_meeting_minutes"
  on meeting_minutes
  for all
  to anon
  using (true)
  with check (true);
