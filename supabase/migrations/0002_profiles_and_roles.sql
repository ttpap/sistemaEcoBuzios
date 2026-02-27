-- EcoBúzios - Perfis e papéis (Auth)
--
-- Objetivo: preparar o Supabase Auth + estrutura de papéis para o app.
--
-- IMPORTANTE (leia):
-- 1) Rode este SQL no Supabase SQL Editor.
-- 2) Este arquivo NÃO ativa RLS nas tabelas de negócio ainda, para não quebrar o app
--    enquanto você migra as telas do localStorage para o Supabase.
-- 3) Depois que o login via Supabase Auth estiver funcionando, a gente ativa RLS
--    nas tabelas de dados (students/classes/attendance/etc.) com políticas corretas.

-- Enum de papéis do sistema
DO $$
BEGIN
  CREATE TYPE app_role AS ENUM ('admin', 'teacher', 'coordinator', 'student');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Tabela de perfis (vincula auth.users -> papel do sistema)
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  full_name text,

  -- vínculos opcionais (quando você migrar professor/aluno/coordenador para Auth)
  teacher_id uuid,
  coordinator_id uuid,
  student_id uuid,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Função helper para checar se usuário é admin (para políticas futuras)
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.role = 'admin'
  );
$$ LANGUAGE sql STABLE;

-- RLS só na tabela de perfis (segura e não quebra o app enquanto migra dados)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Usuário logado pode ver seu próprio perfil
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own"
ON public.profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Usuário logado pode atualizar apenas seu próprio perfil
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
ON public.profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Admin pode ver/alterar tudo em profiles
DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;
CREATE POLICY "profiles_admin_all"
ON public.profiles
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());
