# Supabase (EcoBúzios)

Este repositório tem **2 formas de acesso**:

- **Admin (Supabase Auth + RLS)**: tudo que é cadastro/gestão (projetos, professores, coordenadores, etc.)
  funciona com login pelo Supabase e permissões via RLS.
- **Modo B (login/senha por RPC)**: professor/coordenador/aluno usam credenciais cadastradas nas tabelas,
  e as telas usam **RPCs SECURITY DEFINER** (não dependem de Supabase Auth).

A confusão mais comum é:
- o app estar apontando para um Supabase diferente (URL/anon key), ou
- o Supabase estar certo, mas o **RLS bloquear** (por não existir `profiles.role='admin'`).

---

## 0) Conferir se o app está apontando para o Supabase certo

No painel do app (Admin), existe uma página:
- **Admin → Supabase** (`/supabase`)

Nela você consegue salvar **Project URL** + **anon public key** diretamente no navegador e testar.

Também existe a página:
- **/db-status**

Ela mostra qual URL está sendo usada e se veio de:
- **RUNTIME** (configurado no navegador)
- **VARS DO DEPLOY** (Vercel)
- **FALLBACK** (padrão embutido)

---

## 1) Criar o schema + Auth + RLS (arquivo único)

Rode o SQL de:
- `supabase/migrations/0001_init.sql`

No **SQL Editor** do Supabase.

---

## 2) Habilitar o Modo B (RPCs)

Rode estes arquivos **na ordem** (SQL Editor):

1. `supabase/migrations/0007_mode_b_rpcs_all.sql`
2. `supabase/migrations/0008_mode_b_upsert_student.sql`
3. `supabase/migrations/0010_mode_b_coordinator_classes_rule.sql`
4. `supabase/migrations/0018_mode_b_list_projects.sql`

Opcional (melhorias/funcionalidades específicas):
- `0009_students_allow_update_self.sql` (aluno editar a própria ficha via Auth)
- `0011_students_guardian_declaration.sql` (campo declaração do responsável)
- `0013_teacher_assignments_coordinator_access.sql` (coordenador gerenciar alocações de professores)
- `0016_enel_report_rpc.sql` (relatório ENEL)

---

## 3) Admin: liberar permissões (RLS)

### 3.1 Opção manual (clássica)
1. Supabase → **Authentication** → **Users** → **Add user**
2. Depois: Supabase → **Table Editor** → tabela `profiles` → **Insert row**
   - `user_id`: ID do usuário (Authentication → Users)
   - `role`: `admin`
   - `full_name`: seu nome

### 3.2 Opção automática (recomendado)
Rode o SQL:
- `supabase/migrations/0019_admin_local_bootstrap_admin.sql`

Depois, ao autenticar com o email do admin no Supabase, o app tenta promover automaticamente esse usuário para
`role=admin` (para o RLS liberar INSERT/UPDATE/DELETE).

---

## 4) Edge Functions (somente se você usar links/inscrições públicas)

- `public-student-signup`: inscrição pública de aluno (sem login)
- `public-staff-invite`: gera token de convite (admin)
- `public-staff-signup`: inscrição pública de professor/coordenador via token

Essas funções exigem deploy e variáveis no projeto Supabase:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STAFF_PUBLIC_INVITE_SECRET` (para links públicos de staff)

---

## Erros comuns (e o que significam)

- **"new row violates row-level security policy"**
  - O app está conectado, mas o RLS bloqueou. Normalmente faltou `profiles.role='admin'`.

- **"function ... does not exist" / "rpc_missing"**
  - As migrações do Modo B não foram aplicadas (0007/0008/0018…).

- **"Sua conta autenticou, mas não possui perfil de administrador"**
  - Você autenticou no Supabase Auth, mas não existe `profiles` com `role=admin`.