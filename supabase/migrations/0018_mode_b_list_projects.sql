-- Modo B: listar projetos acessíveis sem depender de Supabase Auth / profiles

CREATE OR REPLACE FUNCTION public.mode_b_list_projects_staff(p_login text, p_password text)
RETURNS TABLE(id uuid, name text, image_url text, created_at timestamptz, role text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  row record;
BEGIN
  SELECT * INTO row
  FROM public.mode_b_login_staff(trim(p_login), trim(p_password))
  LIMIT 1;

  IF row IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT p.id, p.name, p.image_url, p.created_at, row.role::text
    FROM public.projects p
    WHERE p.id = ANY(row.project_ids)
    ORDER BY p.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.mode_b_list_projects_student(p_registration_or_last4 text, p_password text)
RETURNS TABLE(id uuid, name text, image_url text, created_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  row record;
BEGIN
  SELECT * INTO row
  FROM public.mode_b_login_student(trim(p_registration_or_last4), trim(p_password))
  LIMIT 1;

  IF row IS NULL OR COALESCE(row.reason::text, '') <> '' THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT p.id, p.name, p.image_url, p.created_at
    FROM public.projects p
    WHERE p.id = ANY(row.project_ids)
    ORDER BY p.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mode_b_list_projects_staff(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mode_b_list_projects_student(text, text) TO anon, authenticated;
