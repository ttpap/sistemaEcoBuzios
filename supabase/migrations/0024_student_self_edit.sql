-- RPC: professor/coordenador/admin reseta senha do aluno para o padrão
CREATE OR REPLACE FUNCTION public.mode_b_reset_student_password(p_student_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.students WHERE id = p_student_id) THEN
    RETURN false;
  END IF;
  UPDATE public.students SET auth_password = 'EcoBuzios123' WHERE id = p_student_id;
  RETURN true;
END;
$$;

-- RPC: aluno atualiza os próprios dados
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
    health_problems = p_health_problems,
    health_problems_other = p_health_problems_other,
    observations = p_observations,
    image_authorization = p_image_authorization,
    enel_client_number = p_enel_client_number
  WHERE id = p_student_id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mode_b_reset_student_password(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mode_b_student_self_update(uuid,text,text,text,text,date,int,text,text,text,text,text,text,text,boolean,text,text,text,text,text,text,text,text,text,text,text,boolean,text,boolean,text,boolean,text,boolean,text,boolean,text,boolean,text[],text,text,text,text) TO anon, authenticated;
