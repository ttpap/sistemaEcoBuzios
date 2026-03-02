# Vercel + Supabase (variáveis VITE_*)

## Onde achar no Supabase
1. Supabase → seu projeto
2. **Project Settings (engrenagem)** → **API**
3. Copie:
   - **Project URL** → vai em `VITE_SUPABASE_URL`
   - **anon public key** (em "Project API keys") → vai em `VITE_SUPABASE_ANON_KEY`

## Como colocar na Vercel (Import .env)
1. Vercel → seu projeto → **Settings** → **Environment Variables**
2. Clique em **Import .env**
3. Abra `vercel/ENV_IMPORT.env` e cole o conteúdo
4. Preencha os valores (ou edite depois)
5. Salve e faça **Redeploy** do último deployment

> Observação: no Vite, essas variáveis precisam existir na hora do build.
