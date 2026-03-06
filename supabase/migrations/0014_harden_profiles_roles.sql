-- Hardening: impedir que o client atualize livremente roles/ids em public.profiles.
-- A partir daqui, o bind de teacher/coordinator/student deve ser feito via RPC SECURITY DEFINER.

-- 1) Remove update livre do próprio profile (isso permitia setar role/teacher_id/coordinator_id/student_id via client).
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;

-- 2) RPC: vincula o usuário autenticado (auth.uid()) a um teacher/coordinator com base nas credenciais do Modo B.
CREATE OR REPLACE FUNCTION public.mode_b_bind_staff_profile(
  p_login text,
  p_password text
)
RETURNS TABLE(role text, person_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  row record;
  r text;
  pid uuid;
  nm text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT * INTO row
  FROM public.mode_b_login_staff(p_login, p_password)
  LIMIT 1;

  IF row IS NULL THEN
    RAISE EXCEPTION 'invalid_credentials';
  END IF;

  r := COALESCE(row.role::text, '');
  pid := row.person_id;

  IF r NOT IN ('teacher','coordinator') OR pid IS NULL THEN
    RAISE EXCEPTION 'invalid_credentials';
  END IF;

  IF r = 'teacher' THEN
    SELECT t.full_name INTO nm FROM public.teachers t WHERE t.id = pid;

    UPDATE public.profiles p
    SET role = 'teacher',
        full_name = COALESCE(nm, p.full_name),
        teacher_id = pid,
        coordinator_id = NULL,
        student_id = NULL
    WHERE p.user_id = auth.uid();
  ELSE
    SELECT c.full_name INTO nm FROM public.coordinators c WHERE c.id = pid;

    UPDATE public.profiles p
    SET role = 'coordinator',
        full_name = COALESCE(nm, p.full_name),
        coordinator_id = pid,
        teacher_id = NULL,
        student_id = NULL
    WHERE p.user_id = auth.uid();
  END IF;

  RETURN QUERY SELECT r AS role, pid AS person_id;
END;
$$;

-- 3) RPC: vincula o usuário autenticado (auth.uid()) ao student_id com base nas credenciais do Modo B.
CREATE OR REPLACE FUNCTION public.mode_b_bind_student_profile(
  p_registration_or_last4 text,
  p_password text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  row record;
  sid uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT * INTO row
  FROM public.mode_b_login_student(p_registration_or_last4, p_password)
  LIMIT 1;

  IF row IS NULL THEN
    RAISE EXCEPTION 'invalid_credentials';
  END IF;

  IF COALESCE(row.reason::text, '') = 'ambiguous_login' THEN
    RAISE EXCEPTION 'ambiguous_login';
  END IF;

  sid := row.student_id;
  IF sid IS NULL THEN
    RAISE EXCEPTION 'invalid_credentials';
  END IF;

  UPDATE public.profiles p
  SET role = 'student',
      student_id = sid,
      teacher_id = NULL,
      coordinator_id = NULL
  WHERE p.user_id = auth.uid();

  RETURN sid;
END;
$$;

-- Grants: somente authenticated (não anon)
GRANT EXECUTE ON FUNCTION public.mode_b_bind_staff_profile(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mode_b_bind_student_profile(text, text) TO authenticated;
