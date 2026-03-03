-- EcoBúzios — RPCs para listar/criar/editar/excluir turmas no modo B (login/senha)
--
-- Objetivo: permitir que professor/coordenador operem turmas mesmo quando o Supabase Auth
-- (email confirmation) não consegue criar uma sessão autenticada.
--
-- Segurança: valida credenciais em teachers/coordinators + verifica alocação em project_assignments.

CREATE OR REPLACE FUNCTION public.mode_b_staff_can_access_project(p_login text, p_password text, p_project_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  t_id uuid;
  c_id uuid;
BEGIN
  IF coalesce(trim(p_login), '') = '' OR coalesce(trim(p_password), '') = '' OR p_project_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT id INTO t_id
  FROM public.teachers
  WHERE auth_login = trim(p_login)
    AND auth_password = trim(p_password)
  LIMIT 1;

  IF t_id IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.teacher_project_assignments tpa
      WHERE tpa.teacher_id = t_id
        AND tpa.project_id = p_project_id
    );
  END IF;

  SELECT id INTO c_id
  FROM public.coordinators
  WHERE auth_login = trim(p_login)
    AND auth_password = trim(p_password)
  LIMIT 1;

  IF c_id IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.coordinator_project_assignments cpa
      WHERE cpa.coordinator_id = c_id
        AND cpa.project_id = p_project_id
    );
  END IF;

  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.mode_b_list_classes(p_login text, p_password text, p_project_id uuid)
RETURNS SETOF public.classes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.mode_b_staff_can_access_project(p_login, p_password, p_project_id) THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT *
    FROM public.classes c
    WHERE c.project_id = p_project_id
    ORDER BY c.registration_date DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.mode_b_upsert_class(
  p_login text,
  p_password text,
  p_project_id uuid,
  p_id uuid,
  p_name text,
  p_period text,
  p_start_time text,
  p_end_time text,
  p_capacity int,
  p_absence_limit int,
  p_registration_date timestamptz,
  p_status text,
  p_complementary_info text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.mode_b_staff_can_access_project(p_login, p_password, p_project_id) THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;

  -- Garante que não existe turma com mesmo ID em outro projeto.
  IF EXISTS (SELECT 1 FROM public.classes c WHERE c.id = p_id AND c.project_id <> p_project_id) THEN
    RAISE EXCEPTION 'invalid_class_project';
  END IF;

  INSERT INTO public.classes (
    id,
    project_id,
    name,
    period,
    start_time,
    end_time,
    capacity,
    absence_limit,
    registration_date,
    status,
    complementary_info
  )
  VALUES (
    p_id,
    p_project_id,
    p_name,
    p_period,
    p_start_time,
    p_end_time,
    p_capacity,
    p_absence_limit,
    COALESCE(p_registration_date, now()),
    COALESCE(p_status, 'Ativo'),
    p_complementary_info
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    period = EXCLUDED.period,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    capacity = EXCLUDED.capacity,
    absence_limit = EXCLUDED.absence_limit,
    status = EXCLUDED.status,
    complementary_info = EXCLUDED.complementary_info;
END;
$$;

CREATE OR REPLACE FUNCTION public.mode_b_delete_class(p_login text, p_password text, p_class_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  pid uuid;
BEGIN
  SELECT c.project_id INTO pid
  FROM public.classes c
  WHERE c.id = p_class_id;

  IF pid IS NULL THEN
    RETURN;
  END IF;

  IF NOT public.mode_b_staff_can_access_project(p_login, p_password, pid) THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;

  DELETE FROM public.classes c
  WHERE c.id = p_class_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mode_b_staff_can_access_project(text, text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mode_b_list_classes(text, text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mode_b_upsert_class(text, text, uuid, uuid, text, text, text, text, int, int, timestamptz, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mode_b_delete_class(text, text, uuid) TO anon, authenticated;
