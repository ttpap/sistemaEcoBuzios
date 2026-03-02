-- EcoBúzios — schema + Auth (profiles) + RLS/policies (arquivo único)
--
-- Este arquivo consolida as migrações anteriores:
-- - 0001_init.sql (tabelas)
-- - 0002_profiles_and_roles.sql (profiles/roles)
-- - 0003_align_auth_rls.sql (RLS/policies)
--
-- Objetivo: permitir que você rode UM SQL só no Supabase SQL Editor.

create extension if not exists pgcrypto;

-- =====================
-- Core
-- =====================
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  image_url text,
  created_at timestamptz not null default now()
);

-- =====================
-- People
-- =====================
create table if not exists public.teachers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  cpf text,
  rg text,
  cnpj text,
  email text not null,
  cell_phone text not null,
  gender text not null,
  photo text,

  cep text not null,
  street text not null,
  number text not null,
  complement text,
  neighborhood text not null,
  city text not null,
  uf text not null,

  bank text not null,
  agency text not null,
  account text not null,
  pix_key text not null,

  auth_login text not null,
  auth_password text not null,

  registration_date timestamptz not null default now(),
  status text not null default 'Ativo'
);
create unique index if not exists teachers_auth_login_uidx on public.teachers (auth_login);

create table if not exists public.coordinators (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  cpf text,
  rg text,
  cnpj text,
  email text not null,
  cell_phone text not null,
  gender text not null,
  photo text,

  cep text not null,
  street text not null,
  number text not null,
  complement text,
  neighborhood text not null,
  city text not null,
  uf text not null,

  bank text not null,
  agency text not null,
  account text not null,
  pix_key text not null,

  auth_login text not null,
  auth_password text not null,

  registration_date timestamptz not null default now(),
  status text not null default 'Ativo'
);
create unique index if not exists coordinators_auth_login_uidx on public.coordinators (auth_login);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  registration text not null,
  full_name text not null,
  social_name text,
  email text,
  cpf text,
  birth_date date not null,
  age int not null default 0,
  cell_phone text not null,
  gender text not null,
  race text not null,
  photo text,

  guardian_name text,
  guardian_kinship text,
  guardian_phone text,

  school_type text not null,
  school_name text not null,
  school_other text,

  cep text not null,
  street text not null,
  number text not null,
  complement text,
  neighborhood text not null,
  city text not null,
  uf text not null,

  enel_client_number text,

  blood_type text,
  has_allergy boolean not null default false,
  allergy_detail text,
  has_special_needs boolean not null default false,
  special_needs_detail text,
  uses_medication boolean not null default false,
  medication_detail text,
  has_physical_restriction boolean not null default false,
  physical_restriction_detail text,
  practiced_activity boolean not null default false,
  practiced_activity_detail text,
  family_heart_history boolean not null default false,
  health_problems text[] not null default '{}'::text[],
  health_problems_other text,
  observations text,

  image_authorization text not null,
  docs_delivered text[] not null default '{}'::text[],

  registration_date timestamptz not null default now(),
  status text not null default 'Ativo',
  class text not null default 'A definir'
);
create unique index if not exists students_registration_uidx on public.students (registration);

-- =====================
-- Classes & enrollment
-- =====================
create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  period text not null,
  start_time text not null,
  end_time text not null,
  capacity int not null,
  absence_limit int not null,
  registration_date timestamptz not null default now(),
  status text not null default 'Ativo',
  complementary_info text
);
create index if not exists classes_project_idx on public.classes(project_id);

create table if not exists public.class_teachers (
  class_id uuid not null references public.classes(id) on delete cascade,
  teacher_id uuid not null references public.teachers(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (class_id, teacher_id)
);

create table if not exists public.class_student_enrollments (
  class_id uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete restrict,
  enrolled_at timestamptz not null default now(),
  removed_at timestamptz,
  primary key (class_id, student_id, enrolled_at)
);
create index if not exists cse_student_idx on public.class_student_enrollments(student_id);
create index if not exists cse_class_idx on public.class_student_enrollments(class_id);

-- =====================
-- Attendance
-- =====================
create table if not exists public.attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  date date not null,
  created_at timestamptz not null default now(),
  finalized_at timestamptz,
  unique (class_id, date)
);
create index if not exists attendance_sessions_project_idx on public.attendance_sessions(project_id);

create table if not exists public.attendance_session_students (
  session_id uuid not null references public.attendance_sessions(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete restrict,
  primary key (session_id, student_id)
);

-- Postgres não tem "create type if not exists" em todas as versões.
do $$
begin
  create type public.attendance_status as enum ('presente', 'falta', 'atrasado', 'justificada');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.attendance_records (
  session_id uuid not null references public.attendance_sessions(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete restrict,
  status public.attendance_status not null,
  updated_at timestamptz not null default now(),
  primary key (session_id, student_id)
);

-- =====================
-- Student justifications
-- =====================
create table if not exists public.student_justifications (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete restrict,
  date date not null,
  message text not null,
  created_at timestamptz not null default now()
);
create index if not exists student_justifications_project_month_idx on public.student_justifications(project_id, date);

-- =====================
-- Reports
-- =====================
create table if not exists public.monthly_reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  teacher_id uuid not null references public.teachers(id) on delete restrict,
  month text not null,
  strategy_html text not null,
  adaptation_html text not null,
  observation_html text not null,
  reflexive_student_id uuid references public.students(id) on delete set null,
  positive_student_id uuid references public.students(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  submitted_at timestamptz
);
create index if not exists monthly_reports_project_month_idx on public.monthly_reports(project_id, month);

create table if not exists public.coordinator_monthly_reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  coordinator_id uuid not null references public.coordinators(id) on delete restrict,
  month text not null,
  strategy_html text not null,
  adaptation_html text not null,
  observation_html text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  submitted_at timestamptz
);
create index if not exists coordinator_monthly_reports_project_month_idx on public.coordinator_monthly_reports(project_id, month);

-- =====================
-- Expenses
-- =====================
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete set null,
  budget_item text not null,
  company_name text not null,
  cnpj text not null,
  payment_method text not null,
  date date not null,
  doc_number text not null,
  due_date date not null,
  amount numeric(12,2) not null,
  attachment text,
  attachment_name text,
  created_at timestamptz not null default now()
);
create index if not exists expenses_project_date_idx on public.expenses(project_id, date);

-- =====================
-- Roles / Profiles (Supabase Auth)
-- =====================
DO $$
BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'teacher', 'coordinator', 'student');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  full_name text,
  teacher_id uuid,
  coordinator_id uuid,
  student_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- set_updated_at trigger helper (shared)
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- updated_at triggers (profiles + reports)
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_monthly_reports_updated_at ON public.monthly_reports;
CREATE TRIGGER trg_monthly_reports_updated_at
BEFORE UPDATE ON public.monthly_reports
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_coordinator_monthly_reports_updated_at ON public.coordinator_monthly_reports;
CREATE TRIGGER trg_coordinator_monthly_reports_updated_at
BEFORE UPDATE ON public.coordinator_monthly_reports
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- is_admin helper
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.role = 'admin'
  );
$$ LANGUAGE sql STABLE;

-- Current IDs helpers
CREATE OR REPLACE FUNCTION public.current_teacher_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $function$
  SELECT p.teacher_id
  FROM public.profiles p
  WHERE p.user_id = auth.uid();
$function$;

CREATE OR REPLACE FUNCTION public.current_coordinator_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $function$
  SELECT p.coordinator_id
  FROM public.profiles p
  WHERE p.user_id = auth.uid();
$function$;

CREATE OR REPLACE FUNCTION public.current_student_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $function$
  SELECT p.student_id
  FROM public.profiles p
  WHERE p.user_id = auth.uid();
$function$;

-- Auto-create profiles on signup (defaults to student)
CREATE OR REPLACE FUNCTION public.handle_new_user_profiles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, role, full_name)
  VALUES (
    NEW.id,
    'student',
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email)
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS on_auth_user_created_profiles ON auth.users;
CREATE TRIGGER on_auth_user_created_profiles
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profiles();

-- =====================
-- Project assignments (teacher/coordinator)
-- =====================
CREATE TABLE IF NOT EXISTS public.teacher_project_assignments (
  teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (teacher_id, project_id)
);

CREATE TABLE IF NOT EXISTS public.coordinator_project_assignments (
  coordinator_id uuid NOT NULL REFERENCES public.coordinators(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (coordinator_id, project_id)
);

-- =====================
-- RLS enablement
-- =====================
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coordinators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_student_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_session_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_justifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coordinator_monthly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_project_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coordinator_project_assignments ENABLE ROW LEVEL SECURITY;

-- =====================
-- RLS policies
-- =====================

-- profiles
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own
ON public.profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own
ON public.profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS profiles_admin_all ON public.profiles;
CREATE POLICY profiles_admin_all
ON public.profiles
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- teacher_project_assignments
DROP POLICY IF EXISTS teacher_project_assignments_admin_all ON public.teacher_project_assignments;
CREATE POLICY teacher_project_assignments_admin_all
ON public.teacher_project_assignments
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS teacher_project_assignments_select_own ON public.teacher_project_assignments;
CREATE POLICY teacher_project_assignments_select_own
ON public.teacher_project_assignments
FOR SELECT
TO authenticated
USING (public.is_admin() OR teacher_id = public.current_teacher_id());

-- IMPORTANT: prevent policy recursion.
-- The previous version had a policy on teacher_project_assignments that queried
-- coordinator_project_assignments, and another policy on coordinator_project_assignments that
-- queried teacher_project_assignments. That mutual dependency can trigger:
-- "infinite recursion detected in policy".
DROP POLICY IF EXISTS teacher_project_assignments_select_coordinator_projects ON public.teacher_project_assignments;

-- coordinator_project_assignments
DROP POLICY IF EXISTS coordinator_project_assignments_admin_all ON public.coordinator_project_assignments;
CREATE POLICY coordinator_project_assignments_admin_all
ON public.coordinator_project_assignments
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS coordinator_project_assignments_select_own ON public.coordinator_project_assignments;
CREATE POLICY coordinator_project_assignments_select_own
ON public.coordinator_project_assignments
FOR SELECT
TO authenticated
USING (public.is_admin() OR coordinator_id = public.current_coordinator_id());

-- Prevent policy recursion (see note above)
DROP POLICY IF EXISTS coordinator_project_assignments_select_teacher_projects ON public.coordinator_project_assignments;

-- projects
DROP POLICY IF EXISTS projects_admin_all ON public.projects;
CREATE POLICY projects_admin_all ON public.projects
FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS projects_select_assigned ON public.projects;
CREATE POLICY projects_select_assigned ON public.projects
FOR SELECT TO authenticated
USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.teacher_project_assignments tpa
    WHERE tpa.teacher_id = public.current_teacher_id()
      AND tpa.project_id = projects.id
  )
  OR EXISTS (
    SELECT 1
    FROM public.coordinator_project_assignments cpa
    WHERE cpa.coordinator_id = public.current_coordinator_id()
      AND cpa.project_id = projects.id
  )
  OR EXISTS (
    SELECT 1
    FROM public.class_student_enrollments cse
    JOIN public.classes c ON c.id = cse.class_id
    WHERE c.project_id = projects.id
      AND cse.student_id = public.current_student_id()
      AND cse.removed_at IS NULL
  )
);

-- classes
DROP POLICY IF EXISTS classes_admin_all ON public.classes;
CREATE POLICY classes_admin_all ON public.classes
FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS classes_select_assigned ON public.classes;
CREATE POLICY classes_select_assigned ON public.classes
FOR SELECT TO authenticated
USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.teacher_project_assignments tpa
    WHERE tpa.teacher_id = public.current_teacher_id()
      AND tpa.project_id = classes.project_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.coordinator_project_assignments cpa
    WHERE cpa.coordinator_id = public.current_coordinator_id()
      AND cpa.project_id = classes.project_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.class_student_enrollments cse
    WHERE cse.class_id = classes.id
      AND cse.student_id = public.current_student_id()
      AND cse.removed_at IS NULL
  )
);

DROP POLICY IF EXISTS classes_write_assigned ON public.classes;
CREATE POLICY classes_write_assigned ON public.classes
FOR ALL TO authenticated
USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.teacher_project_assignments tpa
    WHERE tpa.teacher_id = public.current_teacher_id()
      AND tpa.project_id = classes.project_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.coordinator_project_assignments cpa
    WHERE cpa.coordinator_id = public.current_coordinator_id()
      AND cpa.project_id = classes.project_id
  )
)
WITH CHECK (
  public.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.teacher_project_assignments tpa
    WHERE tpa.teacher_id = public.current_teacher_id()
      AND tpa.project_id = classes.project_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.coordinator_project_assignments cpa
    WHERE cpa.coordinator_id = public.current_coordinator_id()
      AND cpa.project_id = classes.project_id
  )
);

-- class_teachers
DROP POLICY IF EXISTS class_teachers_admin_all ON public.class_teachers;
CREATE POLICY class_teachers_admin_all ON public.class_teachers
FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS class_teachers_select_assigned ON public.class_teachers;
CREATE POLICY class_teachers_select_assigned ON public.class_teachers
FOR SELECT TO authenticated
USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.classes c
    WHERE c.id = class_teachers.class_id
      AND (
        EXISTS (
          SELECT 1
          FROM public.teacher_project_assignments tpa
          WHERE tpa.teacher_id = public.current_teacher_id()
            AND tpa.project_id = c.project_id
        )
        OR EXISTS (
          SELECT 1
          FROM public.coordinator_project_assignments cpa
          WHERE cpa.coordinator_id = public.current_coordinator_id()
            AND cpa.project_id = c.project_id
        )
      )
  )
);

DROP POLICY IF EXISTS class_teachers_write_assigned ON public.class_teachers;
CREATE POLICY class_teachers_write_assigned ON public.class_teachers
FOR ALL TO authenticated
USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.classes c
    WHERE c.id = class_teachers.class_id
      AND (
        EXISTS (
          SELECT 1
          FROM public.teacher_project_assignments tpa
          WHERE tpa.teacher_id = public.current_teacher_id()
            AND tpa.project_id = c.project_id
        )
        OR EXISTS (
          SELECT 1
          FROM public.coordinator_project_assignments cpa
          WHERE cpa.coordinator_id = public.current_coordinator_id()
            AND cpa.project_id = c.project_id
        )
      )
  )
)
WITH CHECK (
  public.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.classes c
    WHERE c.id = class_teachers.class_id
      AND (
        EXISTS (
          SELECT 1
          FROM public.teacher_project_assignments tpa
          WHERE tpa.teacher_id = public.current_teacher_id()
            AND tpa.project_id = c.project_id
        )
        OR EXISTS (
          SELECT 1
          FROM public.coordinator_project_assignments cpa
          WHERE cpa.coordinator_id = public.current_coordinator_id()
            AND cpa.project_id = c.project_id
        )
      )
  )
);

-- class_student_enrollments
DROP POLICY IF EXISTS cse_admin_all ON public.class_student_enrollments;
CREATE POLICY cse_admin_all ON public.class_student_enrollments
FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS cse_select_assigned ON public.class_student_enrollments;
CREATE POLICY cse_select_assigned ON public.class_student_enrollments
FOR SELECT TO authenticated
USING (
  public.is_admin()
  OR student_id = public.current_student_id()
  OR EXISTS (
    SELECT 1
    FROM public.classes c
    WHERE c.id = class_student_enrollments.class_id
      AND (
        EXISTS (
          SELECT 1
          FROM public.teacher_project_assignments tpa
          WHERE tpa.teacher_id = public.current_teacher_id()
            AND tpa.project_id = c.project_id
        )
        OR EXISTS (
          SELECT 1
          FROM public.coordinator_project_assignments cpa
          WHERE cpa.coordinator_id = public.current_coordinator_id()
            AND cpa.project_id = c.project_id
        )
      )
  )
);

DROP POLICY IF EXISTS cse_write_assigned ON public.class_student_enrollments;
CREATE POLICY cse_write_assigned ON public.class_student_enrollments
FOR ALL TO authenticated
USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.classes c
    WHERE c.id = class_student_enrollments.class_id
      AND (
        EXISTS (
          SELECT 1
          FROM public.teacher_project_assignments tpa
          WHERE tpa.teacher_id = public.current_teacher_id()
            AND tpa.project_id = c.project_id
        )
        OR EXISTS (
          SELECT 1
          FROM public.coordinator_project_assignments cpa
          WHERE cpa.coordinator_id = public.current_coordinator_id()
            AND cpa.project_id = c.project_id
        )
      )
  )
)
WITH CHECK (
  public.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.classes c
    WHERE c.id = class_student_enrollments.class_id
      AND (
        EXISTS (
          SELECT 1
          FROM public.teacher_project_assignments tpa
          WHERE tpa.teacher_id = public.current_teacher_id()
            AND tpa.project_id = c.project_id
        )
        OR EXISTS (
          SELECT 1
          FROM public.coordinator_project_assignments cpa
          WHERE cpa.coordinator_id = public.current_coordinator_id()
            AND cpa.project_id = c.project_id
        )
      )
  )
);

-- teachers
DROP POLICY IF EXISTS teachers_admin_all ON public.teachers;
CREATE POLICY teachers_admin_all ON public.teachers
FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS teachers_select_role ON public.teachers;
CREATE POLICY teachers_select_role ON public.teachers
FOR SELECT TO authenticated
USING (
  public.is_admin()
  OR id = public.current_teacher_id()
  OR EXISTS (
    SELECT 1
    FROM public.teacher_project_assignments tpa
    WHERE tpa.teacher_id = teachers.id
      AND EXISTS (
        SELECT 1
        FROM public.coordinator_project_assignments cpa
        WHERE cpa.coordinator_id = public.current_coordinator_id()
          AND cpa.project_id = tpa.project_id
      )
  )
);

-- coordinators
DROP POLICY IF EXISTS coordinators_admin_all ON public.coordinators;
CREATE POLICY coordinators_admin_all ON public.coordinators
FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS coordinators_select_role ON public.coordinators;
CREATE POLICY coordinators_select_role ON public.coordinators
FOR SELECT TO authenticated
USING (public.is_admin() OR id = public.current_coordinator_id());

-- students
DROP POLICY IF EXISTS students_admin_all ON public.students;
CREATE POLICY students_admin_all ON public.students
FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS students_public_insert ON public.students;
CREATE POLICY students_public_insert ON public.students
FOR INSERT
TO anon
WITH CHECK (true);

DROP POLICY IF EXISTS students_select_role ON public.students;
CREATE POLICY students_select_role ON public.students
FOR SELECT TO authenticated
USING (
  public.is_admin()
  OR id = public.current_student_id()
  OR EXISTS (
    SELECT 1
    FROM public.class_student_enrollments cse
    JOIN public.classes c ON c.id = cse.class_id
    WHERE cse.student_id = students.id
      AND cse.removed_at IS NULL
      AND (
        EXISTS (
          SELECT 1
          FROM public.teacher_project_assignments tpa
          WHERE tpa.teacher_id = public.current_teacher_id()
            AND tpa.project_id = c.project_id
        )
        OR EXISTS (
          SELECT 1
          FROM public.coordinator_project_assignments cpa
          WHERE cpa.coordinator_id = public.current_coordinator_id()
            AND cpa.project_id = c.project_id
        )
      )
  )
);

-- attendance sessions
DROP POLICY IF EXISTS attendance_sessions_admin_all ON public.attendance_sessions;
CREATE POLICY attendance_sessions_admin_all ON public.attendance_sessions
FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS attendance_sessions_select_role ON public.attendance_sessions;
CREATE POLICY attendance_sessions_select_role ON public.attendance_sessions
FOR SELECT TO authenticated
USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.teacher_project_assignments tpa
    WHERE tpa.teacher_id = public.current_teacher_id()
      AND tpa.project_id = attendance_sessions.project_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.coordinator_project_assignments cpa
    WHERE cpa.coordinator_id = public.current_coordinator_id()
      AND cpa.project_id = attendance_sessions.project_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.class_student_enrollments cse
    WHERE cse.class_id = attendance_sessions.class_id
      AND cse.student_id = public.current_student_id()
      AND cse.removed_at IS NULL
  )
);

DROP POLICY IF EXISTS attendance_sessions_write_role ON public.attendance_sessions;
CREATE POLICY attendance_sessions_write_role ON public.attendance_sessions
FOR ALL TO authenticated
USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.teacher_project_assignments tpa
    WHERE tpa.teacher_id = public.current_teacher_id()
      AND tpa.project_id = attendance_sessions.project_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.coordinator_project_assignments cpa
    WHERE cpa.coordinator_id = public.current_coordinator_id()
      AND cpa.project_id = attendance_sessions.project_id
  )
)
WITH CHECK (
  public.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.teacher_project_assignments tpa
    WHERE tpa.teacher_id = public.current_teacher_id()
      AND tpa.project_id = attendance_sessions.project_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.coordinator_project_assignments cpa
    WHERE cpa.coordinator_id = public.current_coordinator_id()
      AND cpa.project_id = attendance_sessions.project_id
  )
);

-- attendance session students
DROP POLICY IF EXISTS attendance_session_students_admin_all ON public.attendance_session_students;
CREATE POLICY attendance_session_students_admin_all ON public.attendance_session_students
FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS attendance_session_students_select_role ON public.attendance_session_students;
CREATE POLICY attendance_session_students_select_role ON public.attendance_session_students
FOR SELECT TO authenticated
USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.attendance_sessions s
    WHERE s.id = attendance_session_students.session_id
      AND (
        EXISTS (
          SELECT 1
          FROM public.teacher_project_assignments tpa
          WHERE tpa.teacher_id = public.current_teacher_id()
            AND tpa.project_id = s.project_id
        )
        OR EXISTS (
          SELECT 1
          FROM public.coordinator_project_assignments cpa
          WHERE cpa.coordinator_id = public.current_coordinator_id()
            AND cpa.project_id = s.project_id
        )
        OR attendance_session_students.student_id = public.current_student_id()
      )
  )
);

DROP POLICY IF EXISTS attendance_session_students_write_role ON public.attendance_session_students;
CREATE POLICY attendance_session_students_write_role ON public.attendance_session_students
FOR ALL TO authenticated
USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.attendance_sessions s
    WHERE s.id = attendance_session_students.session_id
      AND (
        EXISTS (
          SELECT 1
          FROM public.teacher_project_assignments tpa
          WHERE tpa.teacher_id = public.current_teacher_id()
            AND tpa.project_id = s.project_id
        )
        OR EXISTS (
          SELECT 1
          FROM public.coordinator_project_assignments cpa
          WHERE cpa.coordinator_id = public.current_coordinator_id()
            AND cpa.project_id = s.project_id
        )
      )
  )
)
WITH CHECK (
  public.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.attendance_sessions s
    WHERE s.id = attendance_session_students.session_id
      AND (
        EXISTS (
          SELECT 1
          FROM public.teacher_project_assignments tpa
          WHERE tpa.teacher_id = public.current_teacher_id()
            AND tpa.project_id = s.project_id
        )
        OR EXISTS (
          SELECT 1
          FROM public.coordinator_project_assignments cpa
          WHERE cpa.coordinator_id = public.current_coordinator_id()
            AND cpa.project_id = s.project_id
        )
      )
  )
);

-- attendance records
DROP POLICY IF EXISTS attendance_records_admin_all ON public.attendance_records;
CREATE POLICY attendance_records_admin_all ON public.attendance_records
FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS attendance_records_select_role ON public.attendance_records;
CREATE POLICY attendance_records_select_role ON public.attendance_records
FOR SELECT TO authenticated
USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.attendance_sessions s
    WHERE s.id = attendance_records.session_id
      AND (
        EXISTS (
          SELECT 1
          FROM public.teacher_project_assignments tpa
          WHERE tpa.teacher_id = public.current_teacher_id()
            AND tpa.project_id = s.project_id
        )
        OR EXISTS (
          SELECT 1
          FROM public.coordinator_project_assignments cpa
          WHERE cpa.coordinator_id = public.current_coordinator_id()
            AND cpa.project_id = s.project_id
        )
        OR attendance_records.student_id = public.current_student_id()
      )
  )
);

DROP POLICY IF EXISTS attendance_records_write_role ON public.attendance_records;
CREATE POLICY attendance_records_write_role ON public.attendance_records
FOR ALL TO authenticated
USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.attendance_sessions s
    WHERE s.id = attendance_records.session_id
      AND (
        EXISTS (
          SELECT 1
          FROM public.teacher_project_assignments tpa
          WHERE tpa.teacher_id = public.current_teacher_id()
            AND tpa.project_id = s.project_id
        )
        OR EXISTS (
          SELECT 1
          FROM public.coordinator_project_assignments cpa
          WHERE cpa.coordinator_id = public.current_coordinator_id()
            AND cpa.project_id = s.project_id
        )
      )
  )
)
WITH CHECK (
  public.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.attendance_sessions s
    WHERE s.id = attendance_records.session_id
      AND (
        EXISTS (
          SELECT 1
          FROM public.teacher_project_assignments tpa
          WHERE tpa.teacher_id = public.current_teacher_id()
            AND tpa.project_id = s.project_id
        )
        OR EXISTS (
          SELECT 1
          FROM public.coordinator_project_assignments cpa
          WHERE cpa.coordinator_id = public.current_coordinator_id()
            AND cpa.project_id = s.project_id
        )
      )
  )
);

-- student justifications
DROP POLICY IF EXISTS student_justifications_admin_all ON public.student_justifications;
CREATE POLICY student_justifications_admin_all ON public.student_justifications
FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS student_justifications_select_role ON public.student_justifications;
CREATE POLICY student_justifications_select_role ON public.student_justifications
FOR SELECT TO authenticated
USING (
  public.is_admin()
  OR student_id = public.current_student_id()
  OR EXISTS (
    SELECT 1
    FROM public.teacher_project_assignments tpa
    WHERE tpa.teacher_id = public.current_teacher_id()
      AND tpa.project_id = student_justifications.project_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.coordinator_project_assignments cpa
    WHERE cpa.coordinator_id = public.current_coordinator_id()
      AND cpa.project_id = student_justifications.project_id
  )
);

DROP POLICY IF EXISTS student_justifications_insert_own ON public.student_justifications;
CREATE POLICY student_justifications_insert_own ON public.student_justifications
FOR INSERT TO authenticated
WITH CHECK (student_id = public.current_student_id());

DROP POLICY IF EXISTS student_justifications_update_own ON public.student_justifications;
CREATE POLICY student_justifications_update_own ON public.student_justifications
FOR UPDATE TO authenticated
USING (public.is_admin() OR student_id = public.current_student_id())
WITH CHECK (public.is_admin() OR student_id = public.current_student_id());

-- monthly reports
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

-- coordinator monthly reports
DROP POLICY IF EXISTS coordinator_monthly_reports_admin_all ON public.coordinator_monthly_reports;
CREATE POLICY coordinator_monthly_reports_admin_all ON public.coordinator_monthly_reports
FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS coordinator_monthly_reports_select_role ON public.coordinator_monthly_reports;
CREATE POLICY coordinator_monthly_reports_select_role ON public.coordinator_monthly_reports
FOR SELECT TO authenticated
USING (public.is_admin() OR coordinator_id = public.current_coordinator_id());

DROP POLICY IF EXISTS coordinator_monthly_reports_write_own ON public.coordinator_monthly_reports;
CREATE POLICY coordinator_monthly_reports_write_own ON public.coordinator_monthly_reports
FOR ALL TO authenticated
USING (public.is_admin() OR coordinator_id = public.current_coordinator_id())
WITH CHECK (public.is_admin() OR coordinator_id = public.current_coordinator_id());

-- expenses
DROP POLICY IF EXISTS expenses_admin_all ON public.expenses;
CREATE POLICY expenses_admin_all ON public.expenses
FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());