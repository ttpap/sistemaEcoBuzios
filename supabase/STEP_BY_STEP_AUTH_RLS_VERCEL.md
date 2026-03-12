# Passo a passo (leigo) — Supabase (EcoBúzios)

## ETAPA 1 (ADR-001): apontar para um único Supabase oficial

### 1) Pegar as chaves no Supabase
Supabase → seu projeto → **Project Settings (engrenagem)** → **API**
- **Project URL**
- **anon public key**

### 2) Configurar no deploy (Vercel)
Vercel → seu projeto → **Settings** → **Environment Variables**
Crie:
- `VITE_SUPABASE_URL` = Project URL
- `VITE_SUPABASE_ANON_KEY` = anon public key

Marque **Production** e salve.

### 3) Redeploy
Vercel → seu projeto → **Deployments** → **Redeploy**

### 4) Diagnóstico
Abra:
- `https://SEU-DOMINIO/db-status`

A página mostra:
- a URL ativa
- se está conectado
- se o acesso foi bloqueado por RLS

> Nesta etapa não existe fallback silencioso e não existe configuração runtime.