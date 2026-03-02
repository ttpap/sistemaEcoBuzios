# Supabase (EcoBúzios)

## 1) Criar o schema + Auth + RLS (arquivo único)

- Rode o SQL de `supabase/migrations/0001_init.sql` no **SQL Editor** do Supabase.

## 2) Criar usuário admin

Supabase → **Authentication** → **Users** → **Add user**

Depois, insira o perfil do admin:

Supabase → **Table Editor** → tabela `profiles` → **Insert row**
- `user_id`: ID do usuário (Authentication → Users)
- `role`: `admin`
- `full_name`: seu nome

## 3) Observação sobre inscrição pública (/inscricao)

A tela pública usa a Edge Function `public-student-signup` para inserir alunos sem login.
Para isso funcionar no seu projeto Supabase, você precisa fazer o deploy da função e configurar:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Se você não for usar inscrição pública, você pode ignorar essa etapa.