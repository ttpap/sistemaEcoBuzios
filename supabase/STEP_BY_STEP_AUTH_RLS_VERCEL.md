# Passo a passo (leigo) — Supabase Auth + RLS + Vercel (EcoBúzios)

Você escolheu a opção **A: Supabase Auth + RLS**.

> Tradução do que isso significa:
> - O login passa a ser feito pelo Supabase (usuário/senha).
> - O banco decide quem pode ver/editar (RLS = regras de segurança).
> - A aplicação deixa de salvar no navegador (localStorage) e passa a salvar no banco.

---

## 1) Confirmar que a Vercel está passando as variáveis para o front

### 1.1 Pegar as chaves no Supabase
Supabase → seu projeto → **Project Settings (engrenagem)** → **API**
- **Project URL**
- **anon public key**

### 1.2 Configurar na Vercel (tem que ser com prefixo VITE_)
Vercel → seu projeto → **Settings** → **Environment Variables**
Crie:
- `VITE_SUPABASE_URL` = Project URL
- `VITE_SUPABASE_ANON_KEY` = anon public key

Marque **Production** e salve.

### 1.3 Redeploy
Vercel → seu projeto → **Deployments** → **Redeploy**

### 1.4 Teste rápido
Abra no navegador:
- `https://SEU-DOMINIO/db-status`

Se aparecer **CONECTADO**, o front está falando com o Supabase.

---

## 2) Criar o schema (um SQL só)

Supabase → **SQL Editor**
Rode o SQL do arquivo:
- `supabase/migrations/0001_init.sql`

---

## 3) Criar usuários no Supabase Auth (um por pessoa)
Supabase → **Authentication** → **Users** → **Add user**

Crie pelo menos 1 usuário **admin** (o dono do sistema).

---

## 4) Criar o perfil (role) do admin (muito importante)

Supabase → **Table Editor** → tabela **profiles** → **Insert row**
- `user_id`: copie o ID do usuário admin (Authentication → Users)
- `role`: `admin`
- `full_name`: seu nome

---

## 5) Entender por que seus dados não aparecem no banco hoje

Mesmo com Supabase conectado na Vercel, o seu app só vai gravar no banco se:
- você estiver logado, e
- o usuário tiver um `profiles.role` correto (admin/professor/coordenador/aluno), e
- as tabelas/policies do SQL acima tiverem sido criadas.

---

## O que você me confirma agora (2 perguntas)
1) No seu domínio, a página `.../db-status` aparece **CONECTADO**?
2) Você já criou o usuário admin no Supabase Auth e inseriu o perfil `admin` na tabela `profiles`?