-- Cofre simples de segredos server-side (lido só pela Edge Function via service role).
-- Sem policies de RLS → authenticated/anon não acessam; só service role (que ignora RLS).
-- Usado para guardar a RESEND_API_KEY sem precisar mexer no dashboard.

create table if not exists public.app_secrets (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);

alter table public.app_secrets enable row level security;
-- Propositalmente SEM policy: ninguém pelo cliente lê/escreve. Só service role.

revoke all on public.app_secrets from anon, authenticated;
