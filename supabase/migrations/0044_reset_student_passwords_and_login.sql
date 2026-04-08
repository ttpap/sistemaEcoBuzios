-- Reset all student passwords to default EcoBuzios123
UPDATE public.students
SET auth_password = 'EcoBuzios123';

-- Atualiza mode_b_login_student para aceitar APENAS matrícula completa (ex: 2026-0096)
DROP FUNCTION IF EXISTS public.mode_b_login_student(text, text);

CREATE FUNCTION public.mode_b_login_student(p_registration_or_last4 text, p_password text)
RETURNS TABLE(student_id uuid, project_ids uuid[], reason text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  raw text;
  matched_id uuid;
BEGIN
  raw := trim(coalesce(p_registration_or_last4, ''));

  IF raw = '' OR coalesce(trim(p_password), '') = '' THEN
    RETURN QUERY SELECT NULL::uuid, '{}'::uuid[], 'invalid_credentials'::text;
    RETURN;
  END IF;

  -- Aceita apenas matrícula completa com traço (ex: 2026-0096)
  IF position('-' IN raw) = 0 THEN
    RETURN QUERY SELECT NULL::uuid, '{}'::uuid[], 'invalid_credentials'::text;
    RETURN;
  END IF;

  SELECT s.id INTO matched_id
  FROM public.students s
  WHERE s.registration = raw
  LIMIT 1;

  IF matched_id IS NULL THEN
    RETURN QUERY SELECT NULL::uuid, '{}'::uuid[], 'invalid_credentials'::text;
    RETURN;
  END IF;

  -- Verifica senha (case-insensitive, sem espaços)
  IF NOT EXISTS (
    SELECT 1 FROM public.students
    WHERE id = matched_id
      AND lower(regexp_replace(auth_password, '\s+', '', 'g')) = lower(regexp_replace(p_password, '\s+', '', 'g'))
  ) THEN
    RETURN QUERY SELECT NULL::uuid, '{}'::uuid[], 'invalid_credentials'::text;
    RETURN;
  END IF;

  RETURN QUERY
    SELECT
      matched_id AS student_id,
      COALESCE(array_agg(DISTINCT c.project_id) FILTER (WHERE c.project_id IS NOT NULL), '{}'::uuid[]) AS project_ids,
      NULL::text AS reason
    FROM public.class_student_enrollments e
    JOIN public.classes c ON c.id = e.class_id
    WHERE e.student_id = matched_id
      AND e.removed_at IS NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mode_b_login_student(text, text) TO anon, authenticated;
