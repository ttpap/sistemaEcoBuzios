-- RPC (SECURITY DEFINER) para criar/atualizar aluno no Modo B (login/senha)
-- Evita depender de Edge Functions e de sessão Supabase Auth para staff.

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
BEGIN
  IF NOT public.mode_b_staff_can_access_project(p_login, p_password, p_project_id) THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;

  IF p_row IS NULL THEN
    RAISE EXCEPTION 'invalid_payload';
  END IF;

  v_id := NULLIF(p_row->>'id', '')::uuid;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'invalid_id';
  END IF;

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
    p_row->>'registration',
    p_row->>'full_name',
    NULLIF(p_row->>'social_name', ''),
    NULLIF(p_row->>'email', ''),
    NULLIF(p_row->>'cpf', ''),
    (p_row->>'birth_date')::date,
    COALESCE(NULLIF(p_row->>'age', '')::int, 0),
    NULLIF(p_row->>'cell_phone', ''),
    NULLIF(p_row->>'gender', ''),
    NULLIF(p_row->>'race', ''),
    NULLIF(p_row->>'photo', ''),
    NULLIF(p_row->>'guardian_name', ''),
    NULLIF(p_row->>'guardian_kinship', ''),
    NULLIF(p_row->>'guardian_phone', ''),
    NULLIF(p_row->>'school_type', ''),
    NULLIF(p_row->>'school_name', ''),
    NULLIF(p_row->>'school_other', ''),
    NULLIF(p_row->>'cep', ''),
    NULLIF(p_row->>'street', ''),
    NULLIF(p_row->>'number', ''),
    NULLIF(p_row->>'complement', ''),
    NULLIF(p_row->>'neighborhood', ''),
    NULLIF(p_row->>'city', ''),
    NULLIF(p_row->>'uf', ''),
    NULLIF(p_row->>'enel_client_number', ''),
    NULLIF(p_row->>'blood_type', ''),
    COALESCE((p_row->>'has_allergy')::boolean, false),
    NULLIF(p_row->>'allergy_detail', ''),
    COALESCE((p_row->>'has_special_needs')::boolean, false),
    NULLIF(p_row->>'special_needs_detail', ''),
    COALESCE((p_row->>'uses_medication')::boolean, false),
    NULLIF(p_row->>'medication_detail', ''),
    COALESCE((p_row->>'has_physical_restriction')::boolean, false),
    NULLIF(p_row->>'physical_restriction_detail', ''),
    COALESCE((p_row->>'practiced_activity')::boolean, false),
    NULLIF(p_row->>'practiced_activity_detail', ''),
    COALESCE((p_row->>'family_heart_history')::boolean, false),
    COALESCE((p_row->'health_problems')::jsonb, '[]'::jsonb),
    NULLIF(p_row->>'health_problems_other', ''),
    NULLIF(p_row->>'observations', ''),
    NULLIF(p_row->>'image_authorization', ''),
    COALESCE((p_row->'docs_delivered')::jsonb, '[]'::jsonb),
    NULLIF(p_row->>'status', ''),
    NULLIF(p_row->>'class', '')
  )
  ON CONFLICT (id)
  DO UPDATE SET
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
    status = COALESCE(EXCLUDED.status, public.students.status),
    class = COALESCE(EXCLUDED.class, public.students.class);

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mode_b_upsert_student(text, text, uuid, jsonb) TO anon, authenticated;
