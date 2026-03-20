-- Adiciona coluna auth_password na tabela students com default 'EcoBuzios123'
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS auth_password text NOT NULL DEFAULT 'EcoBuzios123';

-- Atualiza mode_b_login_student para verificar auth_password da tabela em vez de hardcoded
DROP FUNCTION IF EXISTS public.mode_b_login_student(text, text);

CREATE FUNCTION public.mode_b_login_student(p_registration_or_last4 text, p_password text)
RETURNS TABLE(student_id uuid, project_ids uuid[], reason text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  raw text;
  last4 text;
  matches uuid[];
  matched_id uuid;
BEGIN
  raw := trim(coalesce(p_registration_or_last4, ''));

  IF raw = '' OR coalesce(trim(p_password), '') = '' THEN
    RETURN QUERY SELECT NULL::uuid, '{}'::uuid[], 'invalid_credentials'::text;
    RETURN;
  END IF;

  -- Find matching students by registration or last 4 digits
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

  matched_id := matches[1];

  -- Verify password against stored auth_password (case-insensitive, strip whitespace)
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

-- RPC para o aluno trocar a própria senha
CREATE OR REPLACE FUNCTION public.mode_b_change_student_password(
  p_student_id uuid,
  p_old_password text,
  p_new_password text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF coalesce(trim(p_new_password), '') = '' THEN
    RETURN false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.students
    WHERE id = p_student_id
      AND lower(regexp_replace(auth_password, '\s+', '', 'g')) = lower(regexp_replace(p_old_password, '\s+', '', 'g'))
  ) THEN
    RETURN false;
  END IF;

  UPDATE public.students
  SET auth_password = trim(p_new_password)
  WHERE id = p_student_id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mode_b_login_student(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mode_b_change_student_password(uuid, text, text) TO anon, authenticated;
