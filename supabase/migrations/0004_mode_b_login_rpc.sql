-- EcoBúzios — RPCs para login no modo B (credenciais) sem expor tabelas sob RLS

-- Staff (professor/coordenador)
CREATE OR REPLACE FUNCTION public.mode_b_login_staff(p_login text, p_password text)
RETURNS TABLE(role text, person_id uuid, project_ids uuid[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  t_id uuid;
  c_id uuid;
BEGIN
  IF coalesce(trim(p_login), '') = '' OR coalesce(trim(p_password), '') = '' THEN
    RETURN;
  END IF;

  SELECT id INTO c_id
  FROM public.coordinators
  WHERE auth_login = trim(p_login)
    AND auth_password = trim(p_password)
  LIMIT 1;

  IF c_id IS NOT NULL THEN
    RETURN QUERY
      SELECT
        'coordinator'::text,
        c_id,
        COALESCE(array_agg(DISTINCT cpa.project_id), '{}'::uuid[])
      FROM public.coordinator_project_assignments cpa
      WHERE cpa.coordinator_id = c_id;
    RETURN;
  END IF;

  SELECT id INTO t_id
  FROM public.teachers
  WHERE auth_login = trim(p_login)
    AND auth_password = trim(p_password)
  LIMIT 1;

  IF t_id IS NOT NULL THEN
    RETURN QUERY
      SELECT
        'teacher'::text,
        t_id,
        COALESCE(array_agg(DISTINCT tpa.project_id), '{}'::uuid[])
      FROM public.teacher_project_assignments tpa
      WHERE tpa.teacher_id = t_id;
    RETURN;
  END IF;

  RETURN;
END;
$$;

-- Student (aluno)
CREATE OR REPLACE FUNCTION public.mode_b_login_student(p_registration_or_last4 text, p_password text)
RETURNS TABLE(student_id uuid, project_ids uuid[], reason text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  raw text;
  last4 text;
  matches uuid[];
BEGIN
  raw := trim(coalesce(p_registration_or_last4, ''));

  IF raw = '' THEN
    RETURN QUERY SELECT NULL::uuid, '{}'::uuid[], 'invalid_credentials'::text;
    RETURN;
  END IF;

  IF lower(regexp_replace(coalesce(p_password, ''), '\s+', '', 'g')) <> lower('EcoBuzios123') THEN
    RETURN QUERY SELECT NULL::uuid, '{}'::uuid[], 'invalid_credentials'::text;
    RETURN;
  END IF;

  IF position('-' IN raw) > 0 THEN
    SELECT array_agg(s.id) INTO matches
    FROM public.students s
    WHERE s.registration = raw;
  ELSE
    last4 := right(lpad(regexp_replace(raw, '\D', '', 'g'), 4, '0'), 4);
    SELECT array_agg(s.id) INTO matches
    FROM public.students s
    WHERE s.registration LIKE '%-' || last4;
  END IF;

  IF matches IS NULL OR array_length(matches, 1) = 0 THEN
    RETURN QUERY SELECT NULL::uuid, '{}'::uuid[], 'invalid_credentials'::text;
    RETURN;
  END IF;

  IF array_length(matches, 1) <> 1 THEN
    RETURN QUERY SELECT NULL::uuid, '{}'::uuid[], 'ambiguous_login'::text;
    RETURN;
  END IF;

  RETURN QUERY
    SELECT
      matches[1] AS student_id,
      COALESCE(array_agg(DISTINCT c.project_id) FILTER (WHERE c.project_id IS NOT NULL), '{}'::uuid[]) AS project_ids,
      NULL::text AS reason
    FROM public.class_student_enrollments e
    JOIN public.classes c ON c.id = e.class_id
    WHERE e.student_id = matches[1]
      AND e.removed_at IS NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mode_b_login_staff(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mode_b_login_student(text, text) TO anon, authenticated;
