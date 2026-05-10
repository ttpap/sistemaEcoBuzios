-- EcoBúzios — Fotógrafos (Modo B: login/senha próprio)
-- Tabelas: photographers, photographer_project_assignments, photo_links
-- RPCs: mode_b_login_photographer, mode_b_list_photographer_assignments,
--       mode_b_upsert_photo_link, mode_b_list_photo_links_for_photographer,
--       mode_b_list_photo_links_for_project, mode_b_list_photo_links_admin,
--       mode_b_delete_photo_link
-- RLS:   admin total; demais via RPC SECURITY DEFINER.

-- =========================
-- Tabela: photographers
-- =========================
CREATE TABLE IF NOT EXISTS public.photographers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text,
  auth_login text NOT NULL,
  auth_password text NOT NULL,
  status text NOT NULL DEFAULT 'Ativo',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS photographers_auth_login_uidx
  ON public.photographers (auth_login);

-- =========================
-- Tabela: photographer_project_assignments
-- =========================
CREATE TABLE IF NOT EXISTS public.photographer_project_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id uuid NOT NULL REFERENCES public.photographers(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (photographer_id, project_id)
);

CREATE INDEX IF NOT EXISTS photographer_assignments_photographer_idx
  ON public.photographer_project_assignments (photographer_id);
CREATE INDEX IF NOT EXISTS photographer_assignments_project_idx
  ON public.photographer_project_assignments (project_id);

-- =========================
-- Tabela: photo_links
-- =========================
CREATE TABLE IF NOT EXISTS public.photo_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  photographer_id uuid NOT NULL REFERENCES public.photographers(id) ON DELETE CASCADE,
  month int NOT NULL CHECK (month BETWEEN 1 AND 12),
  year int NOT NULL CHECK (year BETWEEN 2020 AND 2100),
  description text NOT NULL,
  url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS photo_links_project_idx ON public.photo_links (project_id);
CREATE INDEX IF NOT EXISTS photo_links_photographer_idx ON public.photo_links (photographer_id);
CREATE INDEX IF NOT EXISTS photo_links_year_month_idx ON public.photo_links (year, month);

-- =========================
-- RLS
-- =========================
ALTER TABLE public.photographers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photographer_project_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photo_links ENABLE ROW LEVEL SECURITY;

-- Admin full access
DROP POLICY IF EXISTS photographers_admin_all ON public.photographers;
CREATE POLICY photographers_admin_all ON public.photographers
  AS PERMISSIVE FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS photographer_assignments_admin_all ON public.photographer_project_assignments;
CREATE POLICY photographer_assignments_admin_all ON public.photographer_project_assignments
  AS PERMISSIVE FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS photo_links_admin_all ON public.photo_links;
CREATE POLICY photo_links_admin_all ON public.photo_links
  AS PERMISSIVE FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.role = 'admin'));

-- =========================
-- RPC: login do fotógrafo
-- =========================
CREATE OR REPLACE FUNCTION public.mode_b_login_photographer(p_login text, p_password text)
RETURNS TABLE(photographer_id uuid, full_name text, project_ids uuid[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_ph_id uuid;
  v_ph_name text;
BEGIN
  IF coalesce(trim(p_login), '') = '' OR coalesce(trim(p_password), '') = '' THEN
    RETURN;
  END IF;

  SELECT id, full_name INTO ph_id, ph_name
  FROM public.photographers
  WHERE auth_login = trim(p_login)
    AND auth_password = trim(p_password)
    AND status = 'Ativo'
  LIMIT 1;

  IF ph_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT
      ph_id,
      ph_name,
      COALESCE(array_agg(DISTINCT pa.project_id), '{}'::uuid[])
    FROM public.photographer_project_assignments pa
    WHERE pa.photographer_id = ph_id;
END;
$$;

-- =========================
-- RPC: lista projetos atribuídos (revalida login)
-- =========================
CREATE OR REPLACE FUNCTION public.mode_b_list_photographer_assignments(p_login text, p_password text)
RETURNS TABLE(project_id uuid, project_name text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  ph_id uuid;
BEGIN
  SELECT photographer_id INTO ph_id
  FROM public.mode_b_login_photographer(p_login, p_password)
  LIMIT 1;

  IF ph_id IS NULL THEN
    RAISE EXCEPTION 'invalid_credentials';
  END IF;

  RETURN QUERY
    SELECT p.id, p.name
    FROM public.projects p
    JOIN public.photographer_project_assignments pa ON pa.project_id = p.id
    WHERE pa.photographer_id = ph_id
    ORDER BY p.name;
END;
$$;

-- =========================
-- RPC: upsert de photo_link (pelo fotógrafo)
-- =========================
CREATE OR REPLACE FUNCTION public.mode_b_upsert_photo_link(
  p_login text,
  p_password text,
  p_id uuid,
  p_project_id uuid,
  p_month int,
  p_year int,
  p_description text,
  p_url text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  ph_id uuid;
  has_access boolean;
  result_id uuid;
BEGIN
  SELECT photographer_id INTO ph_id
  FROM public.mode_b_login_photographer(p_login, p_password)
  LIMIT 1;

  IF ph_id IS NULL THEN
    RAISE EXCEPTION 'invalid_credentials';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.photographer_project_assignments
    WHERE photographer_id = ph_id AND project_id = p_project_id
  ) INTO has_access;

  IF NOT has_access THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;

  IF p_month < 1 OR p_month > 12 THEN
    RAISE EXCEPTION 'invalid_month';
  END IF;

  IF coalesce(trim(p_url), '') = '' THEN
    RAISE EXCEPTION 'invalid_url';
  END IF;

  IF p_id IS NULL THEN
    INSERT INTO public.photo_links (project_id, photographer_id, month, year, description, url)
    VALUES (p_project_id, ph_id, p_month, p_year, coalesce(trim(p_description), ''), trim(p_url))
    RETURNING id INTO result_id;
  ELSE
    UPDATE public.photo_links
       SET project_id = p_project_id,
           month = p_month,
           year = p_year,
           description = coalesce(trim(p_description), ''),
           url = trim(p_url),
           updated_at = now()
     WHERE id = p_id AND photographer_id = ph_id
     RETURNING id INTO result_id;

    IF result_id IS NULL THEN
      RAISE EXCEPTION 'not_found_or_not_owner';
    END IF;
  END IF;

  RETURN result_id;
END;
$$;

-- =========================
-- RPC: delete photo_link (pelo fotógrafo dono)
-- =========================
CREATE OR REPLACE FUNCTION public.mode_b_delete_photo_link(
  p_login text,
  p_password text,
  p_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  ph_id uuid;
  deleted_count int;
BEGIN
  SELECT photographer_id INTO ph_id
  FROM public.mode_b_login_photographer(p_login, p_password)
  LIMIT 1;

  IF ph_id IS NULL THEN
    RAISE EXCEPTION 'invalid_credentials';
  END IF;

  DELETE FROM public.photo_links
  WHERE id = p_id AND photographer_id = ph_id;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  IF deleted_count = 0 THEN
    RAISE EXCEPTION 'not_found_or_not_owner';
  END IF;
END;
$$;

-- =========================
-- RPC: lista links do próprio fotógrafo
-- =========================
CREATE OR REPLACE FUNCTION public.mode_b_list_photo_links_for_photographer(
  p_login text,
  p_password text
)
RETURNS TABLE(
  id uuid,
  project_id uuid,
  project_name text,
  photographer_id uuid,
  photographer_name text,
  month int,
  year int,
  description text,
  url text,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  ph_id uuid;
BEGIN
  SELECT photographer_id INTO ph_id
  FROM public.mode_b_login_photographer(p_login, p_password)
  LIMIT 1;

  IF ph_id IS NULL THEN
    RAISE EXCEPTION 'invalid_credentials';
  END IF;

  RETURN QUERY
    SELECT pl.id, pl.project_id, p.name, pl.photographer_id, ph.full_name,
           pl.month, pl.year, pl.description, pl.url, pl.created_at
    FROM public.photo_links pl
    JOIN public.projects p ON p.id = pl.project_id
    JOIN public.photographers ph ON ph.id = pl.photographer_id
    WHERE pl.photographer_id = ph_id
    ORDER BY pl.year DESC, pl.month DESC, pl.created_at DESC;
END;
$$;

-- =========================
-- RPC: lista links de UM projeto (coordenador via staff login)
-- =========================
CREATE OR REPLACE FUNCTION public.mode_b_list_photo_links_for_project(
  p_login text,
  p_password text,
  p_project_id uuid
)
RETURNS TABLE(
  id uuid,
  project_id uuid,
  project_name text,
  photographer_id uuid,
  photographer_name text,
  month int,
  year int,
  description text,
  url text,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.mode_b_staff_can_access_project(p_login, p_password, p_project_id) THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;

  RETURN QUERY
    SELECT pl.id, pl.project_id, p.name, pl.photographer_id, ph.full_name,
           pl.month, pl.year, pl.description, pl.url, pl.created_at
    FROM public.photo_links pl
    JOIN public.projects p ON p.id = pl.project_id
    JOIN public.photographers ph ON ph.id = pl.photographer_id
    WHERE pl.project_id = p_project_id
    ORDER BY pl.year DESC, pl.month DESC, pl.created_at DESC;
END;
$$;

-- =========================
-- Grants
-- =========================
GRANT EXECUTE ON FUNCTION public.mode_b_login_photographer(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mode_b_list_photographer_assignments(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mode_b_upsert_photo_link(text, text, uuid, uuid, int, int, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mode_b_delete_photo_link(text, text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mode_b_list_photo_links_for_photographer(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mode_b_list_photo_links_for_project(text, text, uuid) TO anon, authenticated;
