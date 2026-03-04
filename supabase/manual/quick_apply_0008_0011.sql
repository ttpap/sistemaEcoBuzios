-- Arquivo único (manual) para aplicar as alterações recentes sem perder nada.
-- Conteúdo consolidado de:
-- 0008_mode_b_upsert_student.sql
-- 0009_students_allow_update_self.sql
-- 0010_mode_b_coordinator_classes_rule.sql
-- 0011_students_guardian_declaration.sql
--
-- Pode ser colado e executado no SQL Editor do Supabase.
-- (Usa CREATE OR REPLACE / DROP POLICY IF EXISTS / ADD COLUMN IF NOT EXISTS para ser idempotente.)

-- =====================
-- 0011_students_guardian_declaration.sql
-- =====================
ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS guardian_declaration_confirmed boolean NOT NULL DEFAULT false;

-- =====================
-- 0009_students_allow_update_self.sql
-- =====================
DROP POLICY IF EXISTS students_update_own ON public.students;
CREATE POLICY students_update_own ON public.students
FOR UPDATE TO authenticated
USING (public.is_admin() OR id = public.current_student_id())
WITH CHECK (public.is_admin() OR id = public.current_student_id());

-- =====================
-- 0010_mode_b_coordinator_classes_rule.sql
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

  -- Coordenador (mesma regra do professor)
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
      SELECT c.*
      FROM public.classes c
      JOIN public.class_teachers ct ON ct.class_id = c.id
      WHERE c.project_id = p_project_id
        AND ct.teacher_id = c_id
      ORDER BY c.registration_date DESC;
    RETURN;
  END IF;

  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mode_b_list_my_classes(text, text, uuid) TO anon, authenticated;

-- =====================
-- 0008_mode_b_upsert_student.sql
-- =====================
CREATE OR REPLACE FUNCTION public.mode_b_upsert_student(
  p_login text,
  p_password text,
  p_project_id uuid,
  p_row jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_id uuid;
  v_health_problems text[];
  v_docs_delivered text[];
  v_status text;
  v_class text;
  v_guardian_declaration_confirmed boolean;
  cur_status text;
  cur_class text;
BEGIN
  IF NOT public.mode_b_staff_can_access_project(p_login, p_password, p_project_id) THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;

  v_id := NULLIF(trim(coalesce(p_row->>'id','')), '')::uuid;
  IF v_id IS NULL THEN
    v_id := gen_random_uuid();
  END IF;

  SELECT COALESCE(array_agg(x), '{}'::text[]) INTO v_health_problems
  FROM jsonb_array_elements_text(COALESCE(p_row->'health_problems', '[]'::jsonb)) AS x;

  SELECT COALESCE(array_agg(x), '{}'::text[]) INTO v_docs_delivered
  FROM jsonb_array_elements_text(COALESCE(p_row->'docs_delivered', '[]'::jsonb)) AS x;

  v_guardian_declaration_confirmed := COALESCE((p_row->>'guardian_declaration_confirmed')::boolean, false);

  SELECT status, class INTO cur_status, cur_class
  FROM public.students
  WHERE id = v_id;

  v_status := NULLIF(trim(coalesce(p_row->>'status','')), '');
  v_class := NULLIF(trim(coalesce(p_row->>'class','')), '');

  v_status := COALESCE(v_status, cur_status, 'Ativo');
  v_class := COALESCE(v_class, cur_class, 'A definir');

  INSERT INTO public.students (
    id,
    registration,
    full_name,
    social_name,
    email,
    cpf,
    birth_date,
    age,
    cell_phone,
    gender,
    race,
    photo,

    guardian_name,
    guardian_kinship,
    guardian_phone,
    guardian_declaration_confirmed,

    school_type,
    school_name,
    school_other,

    cep,
    street,
    number,
    complement,
    neighborhood,
    city,
    uf,

    enel_client_number,

    blood_type,
    has_allergy,
    allergy_detail,
    has_special_needs,
    special_needs_detail,
    uses_medication,
    medication_detail,
    has_physical_restriction,
    physical_restriction_detail,
    practiced_activity,
    practiced_activity_detail,
    family_heart_history,
    health_problems,
    health_problems_other,
    observations,

    image_authorization,
    docs_delivered,

    status,
    class
  ) VALUES (
    v_id,
    NULLIF(trim(coalesce(p_row->>'registration','')), ''),
    NULLIF(trim(coalesce(p_row->>'full_name','')), ''),
    NULLIF(trim(coalesce(p_row->>'social_name','')), ''),
    NULLIF(trim(coalesce(p_row->>'email','')), ''),
    NULLIF(trim(coalesce(p_row->>'cpf','')), ''),
    NULLIF(trim(coalesce(p_row->>'birth_date','')), '')::date,
    COALESCE(NULLIF(trim(coalesce(p_row->>'age','')), '')::int, 0),
    NULLIF(trim(coalesce(p_row->>'cell_phone','')), ''),
    NULLIF(trim(coalesce(p_row->>'gender','')), ''),
    NULLIF(trim(coalesce(p_row->>'race','')), ''),
    NULLIF(coalesce(p_row->>'photo',''), ''),

    NULLIF(trim(coalesce(p_row->>'guardian_name','')), ''),
    NULLIF(trim(coalesce(p_row->>'guardian_kinship','')), ''),
    NULLIF(trim(coalesce(p_row->>'guardian_phone','')), ''),
    v_guardian_declaration_confirmed,

    NULLIF(trim(coalesce(p_row->>'school_type','')), ''),
    NULLIF(trim(coalesce(p_row->>'school_name','')), ''),
    NULLIF(trim(coalesce(p_row->>'school_other','')), ''),

    NULLIF(trim(coalesce(p_row->>'cep','')), ''),
    NULLIF(trim(coalesce(p_row->>'street','')), ''),
    NULLIF(trim(coalesce(p_row->>'number','')), ''),
    NULLIF(trim(coalesce(p_row->>'complement','')), ''),
    NULLIF(trim(coalesce(p_row->>'neighborhood','')), ''),
    NULLIF(trim(coalesce(p_row->>'city','')), ''),
    NULLIF(trim(coalesce(p_row->>'uf','')), ''),

    NULLIF(trim(coalesce(p_row->>'enel_client_number','')), ''),

    NULLIF(trim(coalesce(p_row->>'blood_type','')), ''),
    COALESCE((p_row->>'has_allergy')::boolean, false),
    NULLIF(trim(coalesce(p_row->>'allergy_detail','')), ''),
    COALESCE((p_row->>'has_special_needs')::boolean, false),
    NULLIF(trim(coalesce(p_row->>'special_needs_detail','')), ''),
    COALESCE((p_row->>'uses_medication')::boolean, false),
    NULLIF(trim(coalesce(p_row->>'medication_detail','')), ''),
    COALESCE((p_row->>'has_physical_restriction')::boolean, false),
    NULLIF(trim(coalesce(p_row->>'physical_restriction_detail','')), ''),
    COALESCE((p_row->>'practiced_activity')::boolean, false),
    NULLIF(trim(coalesce(p_row->>'practiced_activity_detail','')), ''),
    COALESCE((p_row->>'family_heart_history')::boolean, false),
    v_health_problems,
    NULLIF(trim(coalesce(p_row->>'health_problems_other','')), ''),
    NULLIF(trim(coalesce(p_row->>'observations','')), ''),

    NULLIF(trim(coalesce(p_row->>'image_authorization','')), ''),
    v_docs_delivered,

    v_status,
    v_class
  )
  ON CONFLICT (id) DO UPDATE SET
    registration = EXCLUDED.registration,
    full_name = EXCLUDED.full_name,
    social_name = EXCLUDED.social_name,
    email = EXCLUDED.email,
    cpf = EXCLUDED.cpf,
    birth_date = EXCLUDED.birth_date,
    age = EXCLUDED.age,
    cell_phone = EXCLUDED.cell_phone,
    gender = EXCLUDED.gender,
    race = EXCLUDED.race,
    photo = EXCLUDED.photo,

    guardian_name = EXCLUDED.guardian_name,
    guardian_kinship = EXCLUDED.guardian_kinship,
    guardian_phone = EXCLUDED.guardian_phone,
    guardian_declaration_confirmed = EXCLUDED.guardian_declaration_confirmed,

    school_type = EXCLUDED.school_type,
    school_name = EXCLUDED.school_name,
    school_other = EXCLUDED.school_other,

    cep = EXCLUDED.cep,
    street = EXCLUDED.street,
    number = EXCLUDED.number,
    complement = EXCLUDED.complement,
    neighborhood = EXCLUDED.neighborhood,
    city = EXCLUDED.city,
    uf = EXCLUDED.uf,

    enel_client_number = EXCLUDED.enel_client_number,

    blood_type = EXCLUDED.blood_type,
    has_allergy = EXCLUDED.has_allergy,
    allergy_detail = EXCLUDED.allergy_detail,
    has_special_needs = EXCLUDED.has_special_needs,
    special_needs_detail = EXCLUDED.special_needs_detail,
    uses_medication = EXCLUDED.uses_medication,
    medication_detail = EXCLUDED.medication_detail,
    has_physical_restriction = EXCLUDED.has_physical_restriction,
    physical_restriction_detail = EXCLUDED.physical_restriction_detail,
    practiced_activity = EXCLUDED.practiced_activity,
    practiced_activity_detail = EXCLUDED.practiced_activity_detail,
    family_heart_history = EXCLUDED.family_heart_history,
    health_problems = EXCLUDED.health_problems,
    health_problems_other = EXCLUDED.health_problems_other,
    observations = EXCLUDED.observations,

    image_authorization = EXCLUDED.image_authorization,
    docs_delivered = EXCLUDED.docs_delivered,

    status = COALESCE(EXCLUDED.status, students.status),
    class = COALESCE(EXCLUDED.class, students.class);

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mode_b_upsert_student(text, text, uuid, jsonb) TO anon, authenticated;
