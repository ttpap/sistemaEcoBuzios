-- Escolaridade do aluno (lista fechada). Cadastros existentes = "Sem informação".
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS education_level text NOT NULL DEFAULT 'Sem informação';

ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_education_level_check;
ALTER TABLE public.students ADD CONSTRAINT students_education_level_check CHECK (education_level IN (
  'Não alfabetizado',
  'Fundamental incompleto',
  'Fundamental completo',
  'Médio incompleto',
  'Médio completo',
  'Superior incompleto',
  'Superior completo',
  'Sem informação'
));

-- As RPCs abaixo retornam SETOF students com lista explícita de colunas;
-- a coluna nova (última da tabela) precisa entrar no fim do SELECT.
DO $$
DECLARE
  fn text;
  def text;
  novo text;
BEGIN
  FOREACH fn IN ARRAY ARRAY['mode_b_list_all_students', 'mode_b_list_students', 'mode_b_list_class_students', 'mode_b_get_student_profile'] LOOP
    SELECT pg_get_functiondef(p.oid) INTO def
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = fn;
    IF def IS NULL OR def LIKE '%s.education_level%' THEN CONTINUE; END IF;
    novo := replace(def, 's.family_heart_history_detail' || chr(10), 's.family_heart_history_detail, s.education_level' || chr(10));
    IF novo = def THEN RAISE EXCEPTION 'não consegui ajustar %', fn; END IF;
    EXECUTE novo;
  END LOOP;
END $$;

-- mode_b_upsert_student: grava education_level do p_row (sem valor = mantém o atual).
DO $$
DECLARE
  def text;
  novo text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO def
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'mode_b_upsert_student';
  IF def LIKE '%education_level%' THEN RETURN; END IF;

  novo := replace(def, 'image_authorization, docs_delivered, status, class' || chr(10),
                       'image_authorization, docs_delivered, status, class, education_level' || chr(10));
  novo := replace(novo, '    v_status,' || chr(10) || '    v_class' || chr(10),
                        '    v_status,' || chr(10) || '    v_class,' || chr(10) ||
                        '    COALESCE(NULLIF(trim(coalesce(p_row->>''education_level'','''')), ''''), ''Sem informação'')' || chr(10));
  novo := replace(novo, 'class = COALESCE(EXCLUDED.class, students.class);',
                        'class = COALESCE(EXCLUDED.class, students.class),' || chr(10) ||
                        '    education_level = CASE WHEN NULLIF(trim(coalesce(p_row->>''education_level'','''')), '''') IS NULL' ||
                        ' THEN students.education_level ELSE EXCLUDED.education_level END;');
  IF (length(novo) - length(def)) < 200 THEN RAISE EXCEPTION 'não consegui ajustar mode_b_upsert_student'; END IF;
  EXECUTE novo;
END $$;

-- mode_b_student_self_update: novo parâmetro opcional p_education_level.
DO $$
DECLARE
  v_oid oid;
  def text;
  novo text;
BEGIN
  SELECT p.oid, pg_get_functiondef(p.oid) INTO v_oid, def
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'mode_b_student_self_update';
  IF def LIKE '%p_education_level%' THEN RETURN; END IF;

  novo := replace(def, 'p_enel_client_number text)', 'p_enel_client_number text, p_education_level text DEFAULT NULL::text)');
  novo := replace(novo, 'enel_client_number = p_enel_client_number' || chr(10),
                        'enel_client_number = p_enel_client_number,' || chr(10) ||
                        '    education_level = COALESCE(NULLIF(trim(p_education_level), ''''), education_level)' || chr(10));
  IF (length(novo) - length(def)) < 100 THEN RAISE EXCEPTION 'não consegui ajustar mode_b_student_self_update'; END IF;
  EXECUTE 'DROP FUNCTION public.mode_b_student_self_update(' || pg_get_function_identity_arguments(v_oid) || ')';
  EXECUTE novo;
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.mode_b_student_self_update(' ||
          pg_get_function_identity_arguments((SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                                              WHERE n.nspname = 'public' AND p.proname = 'mode_b_student_self_update')) ||
          ') TO anon, authenticated';
END $$;
