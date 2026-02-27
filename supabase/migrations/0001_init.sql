-- EcoBúzios - schema inicial
-- Observação: este schema é pensado para o app atual (React) e seus tipos.
-- Segurança (RLS/Auth) será configurada em uma etapa seguinte.

create extension if not exists pgcrypto;

-- =====================
-- Core
-- =====================
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  image_url text,
  created_at timestamptz not null default now()
);

-- =====================
-- People
-- =====================
create table if not exists teachers (
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
create unique index if not exists teachers_auth_login_uidx on teachers (auth_login);

create table if not exists coordinators (
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
create unique index if not exists coordinators_auth_login_uidx on coordinators (auth_login);

create table if not exists students (
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
create unique index if not exists students_registration_uidx on students (registration);

-- =====================
-- Classes & enrollment
-- =====================
create table if not exists classes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
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
create index if not exists classes_project_idx on classes(project_id);

create table if not exists class_teachers (
  class_id uuid not null references classes(id) on delete cascade,
  teacher_id uuid not null references teachers(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (class_id, teacher_id)
);

create table if not exists class_student_enrollments (
  class_id uuid not null references classes(id) on delete cascade,
  student_id uuid not null references students(id) on delete restrict,
  enrolled_at timestamptz not null default now(),
  removed_at timestamptz,
  primary key (class_id, student_id, enrolled_at)
);
create index if not exists cse_student_idx on class_student_enrollments(student_id);
create index if not exists cse_class_idx on class_student_enrollments(class_id);

-- =====================
-- Attendance
-- =====================
create table if not exists attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  class_id uuid not null references classes(id) on delete cascade,
  date date not null,
  created_at timestamptz not null default now(),
  finalized_at timestamptz,
  unique (class_id, date)
);
create index if not exists attendance_sessions_project_idx on attendance_sessions(project_id);

create table if not exists attendance_session_students (
  session_id uuid not null references attendance_sessions(id) on delete cascade,
  student_id uuid not null references students(id) on delete restrict,
  primary key (session_id, student_id)
);

-- Postgres não tem "create type if not exists" em todas as versões.
do $$
begin
  create type attendance_status as enum ('presente', 'falta', 'atrasado', 'justificada');
exception
  when duplicate_object then null;
end $$;

create table if not exists attendance_records (
  session_id uuid not null references attendance_sessions(id) on delete cascade,
  student_id uuid not null references students(id) on delete restrict,
  status attendance_status not null,
  updated_at timestamptz not null default now(),
  primary key (session_id, student_id)
);

-- =====================
-- Student justifications
-- =====================
create table if not exists student_justifications (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  class_id uuid not null references classes(id) on delete cascade,
  student_id uuid not null references students(id) on delete restrict,
  date date not null,
  message text not null,
  created_at timestamptz not null default now()
);
create index if not exists student_justifications_project_month_idx on student_justifications(project_id, date);

-- =====================
-- Reports
-- =====================
create table if not exists monthly_reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  teacher_id uuid not null references teachers(id) on delete restrict,
  month text not null,
  strategy_html text not null,
  adaptation_html text not null,
  observation_html text not null,
  reflexive_student_id uuid references students(id) on delete set null,
  positive_student_id uuid references students(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  submitted_at timestamptz
);
create index if not exists monthly_reports_project_month_idx on monthly_reports(project_id, month);

create table if not exists coordinator_monthly_reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  coordinator_id uuid not null references coordinators(id) on delete restrict,
  month text not null,
  strategy_html text not null,
  adaptation_html text not null,
  observation_html text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  submitted_at timestamptz
);
create index if not exists coordinator_monthly_reports_project_month_idx on coordinator_monthly_reports(project_id, month);

-- =====================
-- Expenses
-- =====================
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete set null,
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
create index if not exists expenses_project_date_idx on expenses(project_id, date);

-- =====================
-- Triggers
-- =====================
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_monthly_reports_updated_at on monthly_reports;
create trigger trg_monthly_reports_updated_at
before update on monthly_reports
for each row execute function set_updated_at();

drop trigger if exists trg_coordinator_monthly_reports_updated_at on coordinator_monthly_reports;
create trigger trg_coordinator_monthly_reports_updated_at
before update on coordinator_monthly_reports
for each row execute function set_updated_at();
