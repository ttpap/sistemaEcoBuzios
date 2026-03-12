# Supabase (EcoBúzios)

## ETAPA 1 (ADR-001): um único Supabase oficial via env

O app deve usar **apenas** as variáveis de ambiente do deploy:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

> Não existe fallback silencioso.
> Não existe configuração runtime/localStorage.

### Diagnóstico
- Abra `.../db-status` para ver a URL ativa e o estado real da conexão.

---

## 1) Criar o schema + Auth + RLS (arquivo único)

Rode o SQL de:
- `supabase/migrations/0001_init.sql`

No **SQL Editor** do Supabase.

---

## 2) Admin: liberar permissões (RLS)

Supabase → **Authentication** → **Users** → **Add user**

Depois, insira o perfil do admin:

Supabase → **Table Editor** → tabela `profiles` → **Insert row**
- `user_id`: ID do usuário (Authentication → Users)
- `role`: `admin`
- `full_name`: seu nome