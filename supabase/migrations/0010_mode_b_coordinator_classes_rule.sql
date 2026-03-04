-- Ajuste de permissão (Modo B): coordenador segue a mesma lógica do professor.
-- Como o schema atual não possui tabela de vínculo coordenador->turma,
-- adotamos a regra de vínculo por class_teachers (mesma tabela do professor).
--
-- IMPORTANTE: isso exige que, para um coordenador ver/gerenciar uma turma no Modo B,
-- ele esteja vinculado nessa turma em class_teachers.

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