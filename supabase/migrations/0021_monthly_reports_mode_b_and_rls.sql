-- EcoBúzios — Monthly Reports hardening (Mode B + RLS)
--
-- Goal:
-- 1) Ensure teacher/coordinator can persist & read monthly reports in Mode B (credential-based)
--    via SECURITY DEFINER RPCs.
-- 2) Ensure RLS policies exist and are consistent for Supabase Auth users (admin).
--
-- This migration is idempotent: safe to run multiple times.

-- =====================
-- RLS (tables)
-- =====================
ALTER TABLE IF EXISTS public.monthly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.coordinator_monthly_reports ENABLE ROW LEVEL SECURITY;

-- =====================
-- RLS Policies (keep behavior as defined in 0001_init.sql)
-- =====================

-- monthly_reports
DROP POLICY IF EXISTS monthly_reports_admin_all ON public.monthly_reports;
CREATE POLICY monthly_reports_admin_all ON public.monthly_reports
FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS monthly_reports_select_role ON public.monthly_reports;
CREATE POLICY monthly_reports_select_role ON public.monthly_reports
FOR SELECT TO authenticated
USING (
  public.is_admin()
  OR teacher_id = public.current_teacher_id()
  OR EXISTS (
    SELECT 1
    FROM public.coordinator_project_assignments cpa
    WHERE cpa.coordinator_id = public.current_coordinator_id()
      AND cpa.project_id = monthly_reports.project_id
  )
);

DROP POLICY IF EXISTS monthly_reports_write_own ON public.monthly_reports;
CREATE POLICY monthly_reports_write_own ON public.monthly_reports
FOR ALL TO authenticated
USING (public.is_admin() OR teacher_id = public.current_teacher_id())
WITH CHECK (public.is_admin() OR teacher_id = public.current_teacher_id());

-- coordinator_monthly_reports
DROP POLICY IF EXISTS coordinator_monthly_reports_admin_all ON public.coordinator_monthly_reports;
CREATE POLICY coordinator_monthly_reports_admin_all ON public.coordinator_monthly_reports
FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS coordinator_monthly_reports_select_role ON public.coordinator_monthly_reports;
CREATE POLICY coordinator_monthly_reports_select_role ON public.coordinator_monthly_reports
FOR SELECT TO authenticated
USING (
  public.is_admin()
  OR coordinator_id = public.current_coordinator_id()
);

DROP POLICY IF EXISTS coordinator_monthly_reports_write_own ON public.coordinator_monthly_reports;
CREATE POLICY coordinator_monthly_reports_write_own ON public.coordinator_monthly_reports
FOR ALL TO authenticated
USING (public.is_admin() OR coordinator_id = public.current_coordinator_id())
WITH CHECK (public.is_admin() OR coordinator_id = public.current_coordinator_id());

-- =====================
-- Mode B RPCs — Teacher monthly reports
-- Depends on functions from 0007_mode_b_rpcs_all.sql:
-- - public.mode_b_login_staff(login,password)
-- - public.mode_b_staff_can_access_project(login,password,project_id)
-- =====================

CREATE OR REPLACE FUNCTION public.mode_b_list_monthly_reports(
  p_login text,
  p_password text,
  p_project_id uuid
)
RETURNS TABLE(
  id uuid,
  project_id uuid,
  teacher_id uuid,
  month text,
  strategy_html text,
  adaptation_html text,
  observation_html text,
  reflexive_student_id uuid,
  positive_student_id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  submitted_at timestamptz
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
    SELECT
      r.id,
      r.project_id,
      r.teacher_id,
      r.month,
      r.strategy_html,
      r.adaptation_html,
      r.observation_html,
      r.reflexive_student_id,
      r.positive_student_id,
      r.created_at,
      r.updated_at,
      r.submitted_at
    FROM public.monthly_reports r
    WHERE r.project_id = p_project_id
    ORDER BY r.updated_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.mode_b_upsert_monthly_report(
  p_login text,
  p_password text,
  p_id uuid,
  p_project_id uuid,
  p_teacher_id uuid,
  p_month text,
  p_strategy_html text,
  p_adaptation_html text,
  p_observation_html text,
  p_reflexive_student_id uuid,
  p_positive_student_id uuid,
  p_created_at timestamptz,
  p_updated_at timestamptz,
  p_submitted_at timestamptz
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  staff_role text;
  staff_person_id uuid;
BEGIN
  SELECT role, person_id
    INTO staff_role, staff_person_id
  FROM public.mode_b_login_staff(p_login, p_password)
  LIMIT 1;

  IF staff_role IS NULL OR staff_person_id IS NULL THEN
    RAISE EXCEPTION 'invalid_credentials';
  END IF;

  IF staff_role <> 'teacher' THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;

  IF staff_person_id <> p_teacher_id THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;

  IF NOT public.mode_b_staff_can_access_project(p_login, p_password, p_project_id) THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;

  INSERT INTO public.monthly_reports (
    id, project_id, teacher_id, month,
    strategy_html, adaptation_html, observation_html,
    reflexive_student_id, positive_student_id,
    created_at, updated_at, submitted_at
  )
  VALUES (
    p_id, p_project_id, p_teacher_id, p_month,
    p_strategy_html, p_adaptation_html, p_observation_html,
    p_reflexive_student_id, p_positive_student_id,
    p_created_at, p_updated_at, p_submitted_at
  )
  ON CONFLICT (id) DO UPDATE SET
    project_id = EXCLUDED.project_id,
    teacher_id = EXCLUDED.teacher_id,
    month = EXCLUDED.month,
    strategy_html = EXCLUDED.strategy_html,
    adaptation_html = EXCLUDED.adaptation_html,
    observation_html = EXCLUDED.observation_html,
    reflexive_student_id = EXCLUDED.reflexive_student_id,
    positive_student_id = EXCLUDED.positive_student_id,
    created_at = EXCLUDED.created_at,
    updated_at = EXCLUDED.updated_at,
    submitted_at = EXCLUDED.submitted_at;
END;
$$;

-- =====================
-- Mode B RPCs — Coordinator monthly reports
-- =====================

CREATE OR REPLACE FUNCTION public.mode_b_list_coordinator_monthly_reports(
  p_login text,
  p_password text,
  p_project_id uuid
)
RETURNS TABLE(
  id uuid,
  project_id uuid,
  coordinator_id uuid,
  month text,
  strategy_html text,
  adaptation_html text,
  observation_html text,
  created_at timestamptz,
  updated_at timestamptz,
  submitted_at timestamptz
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
    SELECT
      r.id,
      r.project_id,
      r.coordinator_id,
      r.month,
      r.strategy_html,
      r.adaptation_html,
      r.observation_html,
      r.created_at,
      r.updated_at,
      r.submitted_at
    FROM public.coordinator_monthly_reports r
    WHERE r.project_id = p_project_id
    ORDER BY r.updated_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.mode_b_upsert_coordinator_monthly_report(
  p_login text,
  p_password text,
  p_id uuid,
  p_project_id uuid,
  p_coordinator_id uuid,
  p_month text,
  p_strategy_html text,
  p_adaptation_html text,
  p_observation_html text,
  p_created_at timestamptz,
  p_updated_at timestamptz,
  p_submitted_at timestamptz
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  staff_role text;
  staff_person_id uuid;
BEGIN
  SELECT role, person_id
    INTO staff_role, staff_person_id
  FROM public.mode_b_login_staff(p_login, p_password)
  LIMIT 1;

  IF staff_role IS NULL OR staff_person_id IS NULL THEN
    RAISE EXCEPTION 'invalid_credentials';
  END IF;

  IF staff_role <> 'coordinator' THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;

  IF staff_person_id <> p_coordinator_id THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;

  IF NOT public.mode_b_staff_can_access_project(p_login, p_password, p_project_id) THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;

  INSERT INTO public.coordinator_monthly_reports (
    id, project_id, coordinator_id, month,
    strategy_html, adaptation_html, observation_html,
    created_at, updated_at, submitted_at
  )
  VALUES (
    p_id, p_project_id, p_coordinator_id, p_month,
    p_strategy_html, p_adaptation_html, p_observation_html,
    p_created_at, p_updated_at, p_submitted_at
  )
  ON CONFLICT (id) DO UPDATE SET
    project_id = EXCLUDED.project_id,
    coordinator_id = EXCLUDED.coordinator_id,
    month = EXCLUDED.month,
    strategy_html = EXCLUDED.strategy_html,
    adaptation_html = EXCLUDED.adaptation_html,
    observation_html = EXCLUDED.observation_html,
    created_at = EXCLUDED.created_at,
    updated_at = EXCLUDED.updated_at,
    submitted_at = EXCLUDED.submitted_at;
END;
$$;

-- Allow PostgREST anon/authenticated to execute RPCs.
GRANT EXECUTE ON FUNCTION public.mode_b_list_monthly_reports(text, text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mode_b_upsert_monthly_report(text, text, uuid, uuid, uuid, text, text, text, text, uuid, uuid, timestamptz, timestamptz, timestamptz) TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.mode_b_list_coordinator_monthly_reports(text, text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mode_b_upsert_coordinator_monthly_report(text, text, uuid, uuid, uuid, text, text, text, text, timestamptz, timestamptz, timestamptz) TO anon, authenticated;
