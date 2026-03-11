# Passo a passo (leigo) — Supabase (EcoBúzios)

Este sistema tem dois modos de acesso:

- **Admin (Supabase Auth + RLS)**: o banco controla permissões via `profiles.role`.
- **Modo B (RPC)**: professor/coordenador/aluno usam login/senha cadastrados e o app usa RPCs.

---

## 1) Confirmar que o app está apontando para o Supabase certo

### Opção A — Vercel (produção)
Vercel → Project → **Settings** → **Environment Variables**
Crie (Production):
- `VITE_SUPABASE_URL` = Supabase → Project Settings → API → Project URL
- `VITE_SUPABASE_ANON_KEY` = Supabase → Project Settings → API → anon public key

Depois faça um redeploy.

### Opção B — Pelo próprio painel do sistema (recomendado para testar rápido)
Entre como admin e abra:
- **Admin → Supabase** (`/supabase`)

Cole URL + anon key e clique em **Salvar e recarregar**.

### Teste
Abra:
- `.../db-status`

Ela mostra a URL usada e se veio de RUNTIME/VARS/FALLBACK.

---

## 2) Criar o schema + RLS (um SQL só)

Supabase → **SQL Editor**
Rode:
- `supabase/migrations/0001_init.sql`

---

## 3) Habilitar o Modo B (RPCs)

Supabase → **SQL Editor**
Rode na ordem:
- `0007_mode_b_rpcs_all.sql`
- `0008_mode_b_upsert_student.sql`
- `0010_mode_b_coordinator_classes_rule.sql`
- `0018_mode_b_list_projects.sql`

---

## 4) Liberar Admin (sem travar no RLS)

### Opção manual
Authentication → Users → crie o usuário
Table Editor → `profiles` → crie a linha com `role='admin'`

### Opção automática (recomendado)
Rode:
- `0019_admin_local_bootstrap_admin.sql`

Depois disso, ao logar como admin, o próprio app tenta promover seu usuário para admin.

---

## Erros comuns

- **"new row violates row-level security policy"** → conectou, mas RLS bloqueou (faltou role=admin)
- **"function does not exist" / "rpc_missing"** → faltaram migrações do Modo B