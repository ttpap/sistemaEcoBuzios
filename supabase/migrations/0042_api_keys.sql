-- Tabela de API keys para acesso ao endpoint público de estatísticas
create table if not exists public.api_keys (
  id          uuid primary key default gen_random_uuid(),
  key_hash    text not null unique,           -- SHA-256 da chave (nunca armazenar em texto puro)
  description text not null,                 -- Ex: "Dashboard externo - parceiro X"
  created_by  uuid references auth.users(id),
  created_at  timestamptz not null default now(),
  expires_at  timestamptz,                   -- null = sem expiração
  revoked     boolean not null default false
);

-- Apenas service_role pode ler/escrever (a edge function usa service_role)
alter table public.api_keys enable row level security;

-- Nenhuma leitura direta via anon/authenticated — a validação é feita na edge function com service_role
create policy "api_keys_no_direct_access" on public.api_keys
  for all using (false);

-- Índice para lookup rápido por hash
create index if not exists api_keys_key_hash_idx on public.api_keys (key_hash);
