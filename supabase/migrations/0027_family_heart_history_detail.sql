-- Adiciona campo de detalhe ao histórico cardíaco na família
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS family_heart_history_detail text;

-- Atualiza mode_b_upsert_student para incluir o novo campo
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
    family_heart_history_detail,
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
    NULLIF(trim(coalesce(p_row->>'family_heart_history_detail','')), ''),
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
    family_heart_history_detail = EXCLUDED.family_heart_history_detail,
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

-- Atualiza mode_b_student_self_update para incluir o novo parâmetro
-- Primeiro remove a versão antiga (assinatura diferente)
DROP FUNCTION IF EXISTS public.mode_b_student_self_update(uuid,text,text,text,text,date,int,text,text,text,text,text,text,text,boolean,text,text,text,text,text,text,text,text,text,text,text,boolean,text,boolean,text,boolean,text,boolean,text,boolean,text,boolean,text[],text,text,text,text);

CREATE OR REPLACE FUNCTION public.mode_b_student_self_update(
  p_student_id uuid,
  p_full_name text,
  p_social_name text,
  p_email text,
  p_cpf text,
  p_birth_date date,
  p_age int,
  p_cell_phone text,
  p_gender text,
  p_race text,
  p_photo text,
  p_guardian_name text,
  p_guardian_kinship text,
  p_guardian_phone text,
  p_guardian_declaration_confirmed boolean,
  p_school_type text,
  p_school_name text,
  p_school_other text,
  p_cep text,
  p_street text,
  p_number text,
  p_complement text,
  p_neighborhood text,
  p_city text,
  p_uf text,
  p_blood_type text,
  p_has_allergy boolean,
  p_allergy_detail text,
  p_has_special_needs boolean,
  p_special_needs_detail text,
  p_uses_medication boolean,
  p_medication_detail text,
  p_has_physical_restriction boolean,
  p_physical_restriction_detail text,
  p_practiced_activity boolean,
  p_practiced_activity_detail text,
  p_family_heart_history boolean,
  p_family_heart_history_detail text,
  p_health_problems text[],
  p_health_problems_other text,
  p_observations text,
  p_image_authorization text,
  p_enel_client_number text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.students WHERE id = p_student_id) THEN
    RETURN false;
  END IF;

  UPDATE public.students SET
    full_name = p_full_name,
    social_name = p_social_name,
    email = p_email,
    cpf = p_cpf,
    birth_date = p_birth_date,
    age = p_age,
    cell_phone = p_cell_phone,
    gender = p_gender,
    race = p_race,
    photo = p_photo,
    guardian_name = p_guardian_name,
    guardian_kinship = p_guardian_kinship,
    guardian_phone = p_guardian_phone,
    guardian_declaration_confirmed = p_guardian_declaration_confirmed,
    school_type = p_school_type,
    school_name = p_school_name,
    school_other = p_school_other,
    cep = p_cep,
    street = p_street,
    number = p_number,
    complement = p_complement,
    neighborhood = p_neighborhood,
    city = p_city,
    uf = p_uf,
    blood_type = p_blood_type,
    has_allergy = p_has_allergy,
    allergy_detail = p_allergy_detail,
    has_special_needs = p_has_special_needs,
    special_needs_detail = p_special_needs_detail,
    uses_medication = p_uses_medication,
    medication_detail = p_medication_detail,
    has_physical_restriction = p_has_physical_restriction,
    physical_restriction_detail = p_physical_restriction_detail,
    practiced_activity = p_practiced_activity,
    practiced_activity_detail = p_practiced_activity_detail,
    family_heart_history = p_family_heart_history,
    family_heart_history_detail = p_family_heart_history_detail,
    health_problems = p_health_problems,
    health_problems_other = p_health_problems_other,
    observations = p_observations,
    image_authorization = p_image_authorization,
    enel_client_number = p_enel_client_number
  WHERE id = p_student_id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mode_b_student_self_update(uuid,text,text,text,text,date,int,text,text,text,text,text,text,text,boolean,text,text,text,text,text,text,text,text,text,text,text,boolean,text,boolean,text,boolean,text,boolean,text,boolean,text,boolean,text,text[],text,text,text,text) TO anon, authenticated;
