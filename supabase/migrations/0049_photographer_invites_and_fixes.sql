-- EcoBúzios — Correção variáveis ambíguas RPCs fotógrafo + sistema convites

-- Fix: variáveis colidindo com colunas (full_name, photographer_id)
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

  SELECT ph.id, ph.full_name INTO v_ph_id, v_ph_name
  FROM public.photographers ph
  WHERE ph.auth_login = trim(p_login)
    AND ph.auth_password = trim(p_password)
    AND ph.status = 'Ativo'
  LIMIT 1;

  IF v_ph_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT
      v_ph_id,
      v_ph_name,
      COALESCE(array_agg(DISTINCT pa.project_id), '{}'::uuid[])
    FROM public.photographer_project_assignments pa
    WHERE pa.photographer_id = v_ph_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.mode_b_list_photographer_assignments(p_login text, p_password text)
RETURNS TABLE(project_id uuid, project_name text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_ph_id uuid;
BEGIN
  SELECT m.photographer_id INTO v_ph_id
  FROM public.mode_b_login_photographer(p_login, p_password) m
  LIMIT 1;

  IF v_ph_id IS NULL THEN
    RAISE EXCEPTION 'invalid_credentials';
  END IF;

  RETURN QUERY
    SELECT p.id, p.name
    FROM public.projects p
    JOIN public.photographer_project_assignments pa ON pa.project_id = p.id
    WHERE pa.photographer_id = v_ph_id
    ORDER BY p.name;
END;
$$;

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
  v_ph_id uuid;
  has_access boolean;
  result_id uuid;
BEGIN
  SELECT m.photographer_id INTO v_ph_id
  FROM public.mode_b_login_photographer(p_login, p_password) m
  LIMIT 1;

  IF v_ph_id IS NULL THEN
    RAISE EXCEPTION 'invalid_credentials';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.photographer_project_assignments pa
    WHERE pa.photographer_id = v_ph_id AND pa.project_id = p_project_id
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
    VALUES (p_project_id, v_ph_id, p_month, p_year, coalesce(trim(p_description), ''), trim(p_url))
    RETURNING id INTO result_id;
  ELSE
    UPDATE public.photo_links pl
       SET project_id = p_project_id,
           month = p_month,
           year = p_year,
           description = coalesce(trim(p_description), ''),
           url = trim(p_url),
           updated_at = now()
     WHERE pl.id = p_id AND pl.photographer_id = v_ph_id
     RETURNING pl.id INTO result_id;

    IF result_id IS NULL THEN
      RAISE EXCEPTION 'not_found_or_not_owner';
    END IF;
  END IF;

  RETURN result_id;
END;
$$;

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
  v_ph_id uuid;
  deleted_count int;
BEGIN
  SELECT m.photographer_id INTO v_ph_id
  FROM public.mode_b_login_photographer(p_login, p_password) m
  LIMIT 1;

  IF v_ph_id IS NULL THEN
    RAISE EXCEPTION 'invalid_credentials';
  END IF;

  DELETE FROM public.photo_links pl
  WHERE pl.id = p_id AND pl.photographer_id = v_ph_id;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  IF deleted_count = 0 THEN
    RAISE EXCEPTION 'not_found_or_not_owner';
  END IF;
END;
$$;

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
  v_ph_id uuid;
BEGIN
  SELECT m.photographer_id INTO v_ph_id
  FROM public.mode_b_login_photographer(p_login, p_password) m
  LIMIT 1;

  IF v_ph_id IS NULL THEN
    RAISE EXCEPTION 'invalid_credentials';
  END IF;

  RETURN QUERY
    SELECT pl.id, pl.project_id, p.name, pl.photographer_id, ph.full_name,
           pl.month, pl.year, pl.description, pl.url, pl.created_at
    FROM public.photo_links pl
    JOIN public.projects p ON p.id = pl.project_id
    JOIN public.photographers ph ON ph.id = pl.photographer_id
    WHERE pl.photographer_id = v_ph_id
    ORDER BY pl.year DESC, pl.month DESC, pl.created_at DESC;
END;
$$;

-- =========================
-- Sistema de convites (auto-cadastro fotógrafo)
-- =========================
CREATE TABLE IF NOT EXISTS public.photographer_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '14 days',
  used_at timestamptz,
  used_photographer_id uuid REFERENCES public.photographers(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS photographer_invites_token_idx ON public.photographer_invites (token);

ALTER TABLE public.photographer_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS photographer_invites_admin_all ON public.photographer_invites;
CREATE POLICY photographer_invites_admin_all ON public.photographer_invites
  AS PERMISSIVE FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.role = 'admin'));

CREATE OR REPLACE FUNCTION public.create_photographer_invite()
RETURNS TABLE(token text, expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  is_admin boolean;
  v_token text;
  v_expires timestamptz;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.role = 'admin'
  ) INTO is_admin;

  IF NOT is_admin THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;

  v_token := encode(gen_random_bytes(24), 'hex');
  v_expires := now() + interval '14 days';

  INSERT INTO public.photographer_invites (token, expires_at)
  VALUES (v_token, v_expires);

  RETURN QUERY SELECT v_token, v_expires;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_photographer_invite(p_token text)
RETURNS TABLE(valid boolean, reason text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_used_at timestamptz;
  v_expires timestamptz;
BEGIN
  SELECT pi.used_at, pi.expires_at INTO v_used_at, v_expires
  FROM public.photographer_invites pi
  WHERE pi.token = trim(p_token)
  LIMIT 1;

  IF v_expires IS NULL THEN
    RETURN QUERY SELECT false, 'not_found'::text;
    RETURN;
  END IF;

  IF v_used_at IS NOT NULL THEN
    RETURN QUERY SELECT false, 'already_used'::text;
    RETURN;
  END IF;

  IF v_expires < now() THEN
    RETURN QUERY SELECT false, 'expired'::text;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, ''::text;
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_photographer_invite(
  p_token text,
  p_full_name text,
  p_email text,
  p_login text,
  p_password text
)
RETURNS TABLE(photographer_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_inv_id uuid;
  v_used_at timestamptz;
  v_expires timestamptz;
  v_new_ph_id uuid;
  v_login text;
  v_password text;
  v_name text;
  v_email text;
BEGIN
  v_login := trim(coalesce(p_login, ''));
  v_password := trim(coalesce(p_password, ''));
  v_name := trim(coalesce(p_full_name, ''));
  v_email := nullif(trim(coalesce(p_email, '')), '');

  IF v_name = '' OR v_login = '' OR v_password = '' THEN
    RAISE EXCEPTION 'missing_fields';
  END IF;

  SELECT pi.id, pi.used_at, pi.expires_at INTO v_inv_id, v_used_at, v_expires
  FROM public.photographer_invites pi
  WHERE pi.token = trim(p_token)
  LIMIT 1
  FOR UPDATE;

  IF v_inv_id IS NULL THEN
    RAISE EXCEPTION 'invalid_token';
  END IF;
  IF v_used_at IS NOT NULL THEN
    RAISE EXCEPTION 'already_used';
  END IF;
  IF v_expires < now() THEN
    RAISE EXCEPTION 'expired';
  END IF;

  IF EXISTS (SELECT 1 FROM public.photographers WHERE auth_login = v_login) THEN
    RAISE EXCEPTION 'login_in_use';
  END IF;

  INSERT INTO public.photographers (full_name, email, auth_login, auth_password, status)
  VALUES (v_name, v_email, v_login, v_password, 'Ativo')
  RETURNING id INTO v_new_ph_id;

  UPDATE public.photographer_invites
     SET used_at = now(), used_photographer_id = v_new_ph_id
   WHERE id = v_inv_id;

  RETURN QUERY SELECT v_new_ph_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_photographer_invite() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_photographer_invite(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_photographer_invite(text, text, text, text, text) TO anon, authenticated;
