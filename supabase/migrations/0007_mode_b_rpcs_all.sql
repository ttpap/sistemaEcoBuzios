-- EcoBúzios — Modo B (login/senha) — RPCs consolidadas
--
-- Use este arquivo quando você quiser aplicar TUDO do modo B de uma vez:
-- - Login de professor/coordenador (mode_b_login_staff)
-- - Login de aluno (mode_b_login_student)
-- - Permissões/CRUD de turmas para staff (mode_b_*_class*)
-- - Matrícula/remoção de alunos em turmas (mode_b_*_enrollment*)
-- - Listagem de alunos (modo B) para não depender de SELECT/RLS
-- - Calendário/justificativas do aluno (mode_b_student_month_schedule / mode_b_set_student_justification)
--
-- Este SQL é idempotente (CREATE OR REPLACE / DO ... duplicate_object), podendo ser colado no SQL Editor.

-- Garante enum usado no calendário (caso o schema base ainda não tenha criado)
DO $$
BEGIN
  CREATE TYPE public.attendance_status AS ENUM ('presente', 'falta', 'atrasado', 'justificada');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =====================
-- Login (staff)
-- =====================
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

-- =====================
-- Login (student)
-- =====================
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

  -- Senha padrão (aluno)
  IF lower(regexp_replace(coalesce(p_password, ''), '\\s+', '', 'g')) <> lower('EcoBuzios123') THEN
    RETURN QUERY SELECT NULL::uuid, '{}'::uuid[], 'invalid_credentials'::text;
    RETURN;
  END IF;

  IF position('-' IN raw) > 0 THEN
    SELECT array_agg(s.id) INTO matches
    FROM public.students s
    WHERE s.registration = raw;
  ELSE
    last4 := right(lpad(regexp_replace(raw, '\\D', '', 'g'), 4, '0'), 4);
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

-- =====================
-- Turmas (staff) — checagem de acesso e CRUD
-- =====================
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

-- Checagem de permissão por turma:
-- - coordenador: pode gerenciar turmas do projeto
-- - professor: pode gerenciar SOMENTE turmas em que está vinculado (class_teachers)
CREATE OR REPLACE FUNCTION public.mode_b_staff_can_manage_class(p_login text, p_password text, p_class_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  t_id uuid;
  c_id uuid;
  pid uuid;
BEGIN
  IF coalesce(trim(p_login), '') = '' OR coalesce(trim(p_password), '') = '' OR p_class_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT c.project_id INTO pid
  FROM public.classes c
  WHERE c.id = p_class_id;

  IF pid IS NULL THEN
    RETURN false;
  END IF;

  -- Professor
  SELECT id INTO t_id
  FROM public.teachers
  WHERE auth_login = trim(p_login)
    AND auth_password = trim(p_password)
  LIMIT 1;

  IF t_id IS NOT NULL THEN
    RETURN (
      EXISTS (
        SELECT 1
        FROM public.teacher_project_assignments tpa
        WHERE tpa.teacher_id = t_id
          AND tpa.project_id = pid
      )
      AND EXISTS (
        SELECT 1
        FROM public.class_teachers ct
        WHERE ct.class_id = p_class_id
          AND ct.teacher_id = t_id
      )
    );
  END IF;

  -- Coordenador
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
        AND cpa.project_id = pid
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

-- =====================
-- Turmas (staff) — listagem (somente turmas vinculadas para professor)
-- =====================

CREATE OR REPLACE FUNCTION public.mode_b_list_my_classes(p_login text, p_password text, p_project_id uuid)
RETURNS SETOF public.classes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  t_id uuid;
  c_id uuid;
BEGIN
  IF coalesce(trim(p_login), '') = '' OR coalesce(trim(p_password), '') = '' OR p_project_id IS NULL THEN
    RETURN;
  END IF;

  -- Professor
  SELECT id INTO t_id
  FROM public.teachers
  WHERE auth_login = trim(p_login)
    AND auth_password = trim(p_password)
  LIMIT 1;

  IF t_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.teacher_project_assignments tpa
      WHERE tpa.teacher_id = t_id
        AND tpa.project_id = p_project_id
    ) THEN
      RETURN;
    END IF;

    RETURN QUERY
      SELECT c.*
      FROM public.classes c
      JOIN public.class_teachers ct ON ct.class_id = c.id
      WHERE c.project_id = p_project_id
        AND ct.teacher_id = t_id
      ORDER BY c.registration_date DESC;
    RETURN;
  END IF;

  -- Coordenador (vê todas as turmas do projeto)
  SELECT id INTO c_id
  FROM public.coordinators
  WHERE auth_login = trim(p_login)
    AND auth_password = trim(p_password)
  LIMIT 1;

  IF c_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.coordinator_project_assignments cpa
      WHERE cpa.coordinator_id = c_id
        AND cpa.project_id = p_project_id
    ) THEN
      RETURN;
    END IF;

    RETURN QUERY
      SELECT *
      FROM public.classes c
      WHERE c.project_id = p_project_id
      ORDER BY c.registration_date DESC;
    RETURN;
  END IF;

  RETURN;
END;
$$;

-- =====================
-- Turmas (staff) — CRUD (quando professor criar, vincula automaticamente na turma)
-- =====================

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
DECLARE
  t_id uuid;
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

  -- Se o criador for professor, vincula automaticamente o professor à turma.
  SELECT id INTO t_id
  FROM public.teachers
  WHERE auth_login = trim(p_login)
    AND auth_password = trim(p_password)
  LIMIT 1;

  IF t_id IS NOT NULL THEN
    INSERT INTO public.class_teachers (class_id, teacher_id)
    VALUES (p_id, t_id)
    ON CONFLICT DO NOTHING;
  END IF;
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

-- =====================
-- Matrículas de alunos em turmas (modo B)
-- =====================

CREATE OR REPLACE FUNCTION public.mode_b_list_class_enrollments(
  p_login text,
  p_password text,
  p_class_id uuid
)
RETURNS TABLE(
  class_id uuid,
  student_id uuid,
  enrolled_at timestamptz,
  removed_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.mode_b_staff_can_manage_class(p_login, p_password, p_class_id) THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT e.class_id, e.student_id, e.enrolled_at, e.removed_at
    FROM public.class_student_enrollments e
    WHERE e.class_id = p_class_id
    ORDER BY e.enrolled_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.mode_b_enroll_student(
  p_login text,
  p_password text,
  p_class_id uuid,
  p_student_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.mode_b_staff_can_manage_class(p_login, p_password, p_class_id) THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.class_student_enrollments e
    WHERE e.class_id = p_class_id
      AND e.student_id = p_student_id
  ) THEN
    UPDATE public.class_student_enrollments
    SET removed_at = NULL
    WHERE class_id = p_class_id
      AND student_id = p_student_id;
    RETURN;
  END IF;

  INSERT INTO public.class_student_enrollments (class_id, student_id, enrolled_at, removed_at)
  VALUES (p_class_id, p_student_id, now(), NULL);
END;
$$;

CREATE OR REPLACE FUNCTION public.mode_b_remove_student_enrollment(
  p_login text,
  p_password text,
  p_class_id uuid,
  p_student_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.mode_b_staff_can_manage_class(p_login, p_password, p_class_id) THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;

  UPDATE public.class_student_enrollments
  SET removed_at = now()
  WHERE class_id = p_class_id
    AND student_id = p_student_id;
END;
$$;

-- =====================
-- Alunos (modo B)
-- =====================

CREATE OR REPLACE FUNCTION public.mode_b_list_students(
  p_login text,
  p_password text,
  p_project_id uuid
)
RETURNS SETOF public.students
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.mode_b_staff_can_access_project(p_login, p_password, p_project_id) THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;

  RETURN QUERY
    SELECT *
    FROM public.students s
    ORDER BY s.registration_date DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.mode_b_list_class_students(
  p_login text,
  p_password text,
  p_class_id uuid
)
RETURNS SETOF public.students
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.mode_b_staff_can_manage_class(p_login, p_password, p_class_id) THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;

  RETURN QUERY
    SELECT s.*
    FROM public.class_student_enrollments e
    JOIN public.students s ON s.id = e.student_id
    WHERE e.class_id = p_class_id
      AND e.removed_at IS NULL
    ORDER BY s.full_name ASC;
END;
$$;

-- =====================
-- Chamadas (attendance) — modo B (staff)
-- =====================

CREATE OR REPLACE FUNCTION public.mode_b_list_attendance_sessions(
  p_login text,
  p_password text,
  p_project_id uuid,
  p_class_id uuid
)
RETURNS TABLE(
  id uuid,
  class_id uuid,
  date date,
  created_at timestamptz,
  finalized_at timestamptz,
  student_ids uuid[],
  records jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.mode_b_staff_can_access_project(p_login, p_password, p_project_id) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    s.id,
    s.class_id,
    s.date,
    s.created_at,
    s.finalized_at,
    COALESCE(ss.student_ids, '{}'::uuid[]) AS student_ids,
    COALESCE(rr.records, '{}'::jsonb) AS records
  FROM public.attendance_sessions s
  LEFT JOIN (
    SELECT session_id, array_agg(student_id) AS student_ids
    FROM public.attendance_session_students
    GROUP BY session_id
  ) ss ON ss.session_id = s.id
  LEFT JOIN (
    SELECT session_id, jsonb_object_agg(student_id::text, status::text) AS records
    FROM public.attendance_records
    GROUP BY session_id
  ) rr ON rr.session_id = s.id
  WHERE s.project_id = p_project_id
    AND (p_class_id IS NULL OR s.class_id = p_class_id)
  ORDER BY s.date DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.mode_b_upsert_attendance_session(
  p_login text,
  p_password text,
  p_project_id uuid,
  p_id uuid,
  p_class_id uuid,
  p_date date,
  p_created_at timestamptz,
  p_finalized_at timestamptz,
  p_student_ids uuid[],
  p_records jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  k text;
  v text;
BEGIN
  IF NOT public.mode_b_staff_can_access_project(p_login, p_password, p_project_id) THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;

  INSERT INTO public.attendance_sessions (id, project_id, class_id, date, created_at, finalized_at)
  VALUES (p_id, p_project_id, p_class_id, p_date, COALESCE(p_created_at, now()), p_finalized_at)
  ON CONFLICT (id) DO UPDATE SET
    class_id = EXCLUDED.class_id,
    date = EXCLUDED.date,
    created_at = EXCLUDED.created_at,
    finalized_at = EXCLUDED.finalized_at;

  -- Snapshot students
  DELETE FROM public.attendance_session_students WHERE session_id = p_id;
  IF p_student_ids IS NOT NULL AND array_length(p_student_ids, 1) > 0 THEN
    INSERT INTO public.attendance_session_students (session_id, student_id)
    SELECT p_id, unnest(p_student_ids);
  END IF;

  -- Records
  DELETE FROM public.attendance_records WHERE session_id = p_id;
  IF p_records IS NOT NULL AND jsonb_typeof(p_records) = 'object' THEN
    FOR k, v IN SELECT * FROM jsonb_each_text(p_records)
    LOOP
      -- v deve ser um dos valores do enum attendance_status
      INSERT INTO public.attendance_records (session_id, student_id, status)
      VALUES (p_id, k::uuid, v::public.attendance_status);
    END LOOP;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.mode_b_delete_attendance_session(
  p_login text,
  p_password text,
  p_session_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  pid uuid;
BEGIN
  SELECT s.project_id INTO pid
  FROM public.attendance_sessions s
  WHERE s.id = p_session_id;

  IF pid IS NULL THEN
    RETURN;
  END IF;

  IF NOT public.mode_b_staff_can_access_project(p_login, p_password, pid) THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;

  DELETE FROM public.attendance_records WHERE session_id = p_session_id;
  DELETE FROM public.attendance_session_students WHERE session_id = p_session_id;
  DELETE FROM public.attendance_sessions WHERE id = p_session_id;
END;
$$;

-- =====================
-- Calendário/Justificativas (modo B)
-- =====================
CREATE OR REPLACE FUNCTION public.mode_b_student_month_schedule(
  p_project_id uuid,
  p_student_id uuid,
  p_month text
)
RETURNS TABLE(
  ymd text,
  class_id uuid,
  class_name text,
  start_time text,
  end_time text,
  finalized_at timestamptz,
  status public.attendance_status,
  justification_message text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH params AS (
    SELECT (p_month || '-01')::date AS start_date
  ),
  range AS (
    SELECT start_date, (start_date + INTERVAL '1 month')::date AS end_date
    FROM params
  )
  SELECT
    to_char(s.date, 'YYYY-MM-DD') AS ymd,
    s.class_id,
    c.name AS class_name,
    c.start_time,
    c.end_time,
    s.finalized_at,
    r.status,
    j.message AS justification_message
  FROM public.attendance_sessions s
  JOIN public.classes c ON c.id = s.class_id
  JOIN public.class_student_enrollments e ON e.class_id = s.class_id
  LEFT JOIN public.attendance_records r
    ON r.session_id = s.id AND r.student_id = p_student_id
  LEFT JOIN public.student_justifications j
    ON j.project_id = s.project_id
   AND j.class_id = s.class_id
   AND j.student_id = p_student_id
   AND j.date = s.date
  CROSS JOIN range rg
  WHERE s.project_id = p_project_id
    AND e.student_id = p_student_id
    AND e.removed_at IS NULL
    AND s.date >= rg.start_date
    AND s.date < rg.end_date
  ORDER BY s.date ASC, c.start_time ASC;
$$;

CREATE OR REPLACE FUNCTION public.mode_b_set_student_justification(
  p_project_id uuid,
  p_class_id uuid,
  p_student_id uuid,
  p_date date,
  p_message text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  existing_id uuid;
  new_id uuid;
BEGIN
  SELECT id INTO existing_id
  FROM public.student_justifications
  WHERE project_id = p_project_id
    AND class_id = p_class_id
    AND student_id = p_student_id
    AND date = p_date
  LIMIT 1;

  IF existing_id IS NOT NULL THEN
    UPDATE public.student_justifications
    SET message = p_message
    WHERE id = existing_id;
    RETURN existing_id;
  END IF;

  INSERT INTO public.student_justifications (project_id, class_id, student_id, date, message)
  VALUES (p_project_id, p_class_id, p_student_id, p_date, p_message)
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.mode_b_class_month_justifications(
  p_project_id uuid,
  p_class_id uuid,
  p_month text
)
RETURNS TABLE(
  id uuid,
  student_id uuid,
  ymd text,
  message text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH params AS (
    SELECT (p_month || '-01')::date AS start_date
  ),
  range AS (
    SELECT start_date, (start_date + INTERVAL '1 month')::date AS end_date
    FROM params
  )
  SELECT
    j.id,
    j.student_id,
    to_char(j.date, 'YYYY-MM-DD') AS ymd,
    j.message,
    j.created_at
  FROM public.student_justifications j
  CROSS JOIN range rg
  WHERE j.project_id = p_project_id
    AND j.class_id = p_class_id
    AND j.date >= rg.start_date
    AND j.date < rg.end_date
  ORDER BY j.date DESC, j.created_at DESC;
$$;

-- =====================
-- Grants (turmas)
-- =====================
GRANT EXECUTE ON FUNCTION public.mode_b_list_my_classes(text, text, uuid) TO anon, authenticated;

-- =====================
-- Grants
-- =====================
GRANT EXECUTE ON FUNCTION public.mode_b_login_staff(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mode_b_login_student(text, text) TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.mode_b_staff_can_access_project(text, text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mode_b_staff_can_manage_class(text, text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mode_b_list_classes(text, text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mode_b_upsert_class(text, text, uuid, uuid, text, text, text, text, int, int, timestamptz, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mode_b_delete_class(text, text, uuid) TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.mode_b_list_class_enrollments(text, text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mode_b_enroll_student(text, text, uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mode_b_remove_student_enrollment(text, text, uuid, uuid) TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.mode_b_list_students(text, text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mode_b_list_class_students(text, text, uuid) TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.mode_b_list_attendance_sessions(text, text, uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mode_b_upsert_attendance_session(text, text, uuid, uuid, uuid, date, timestamptz, timestamptz, uuid[], jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mode_b_delete_attendance_session(text, text, uuid) TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.mode_b_student_month_schedule(uuid, uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mode_b_set_student_justification(uuid, uuid, uuid, date, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mode_b_class_month_justifications(uuid, uuid, text) TO anon, authenticated;