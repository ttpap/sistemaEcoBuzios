# Supabase (EcoBúzios)

## 1) Criar o schema

- Rode o SQL de `supabase/migrations/0001_init.sql` no **SQL Editor** do Supabase.

## 2) Próximos passos (importante)

Este projeto atualmente usa autenticação e persistência via `localStorage`. Para usar Supabase em produção de forma **segura**, existem 3 caminhos:

1. **Migrar o login para Supabase Auth + RLS** (recomendado)
2. **Manter o login atual e usar uma API backend (Netlify Functions) com Service Role**
3. **Desativar RLS e usar Anon Key direto no front** (não recomendado, especialmente com dados de alunos)

Me diga qual opção você quer seguir que eu implemento a parte do app (leitura/escrita no banco) do jeito correto.
