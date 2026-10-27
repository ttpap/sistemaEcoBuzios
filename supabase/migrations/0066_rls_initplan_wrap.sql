-- Disk IO / CPU: policies RLS chamavam is_admin(), current_*_id() e auth.uid() uma vez POR LINHA
-- (cada chamada = lookup em profiles). Embrulhar em (select ...) faz o planner avaliar uma vez por
-- statement (InitPlan). Semântica idêntica: as funções são STABLE e não recebem argumento.
-- Só o texto de USING / WITH CHECK muda; nome, comando (cmd) e roles ficam intactos.
-- Autocheck: depois de cada ALTER, desfaz o embrulho no texto novo e exige igualdade com o texto antigo;
-- qualquer divergência levanta exceção e a migração inteira é desfeita.
-- Rollback: supabase/rollback/2026-10-27_disk_io_rollback.sql
DO $$
DECLARE
  r record;
  q text;
  w text;
  nq text;
  nw text;
  stmt text;
  n int := 0;
  fn_re constant text := '(is_admin|current_teacher_id|current_coordinator_id|current_student_id|auth\.uid)';
BEGIN
  FOR r IN
    SELECT * FROM pg_policies
    WHERE schemaname = 'public'
      AND (coalesce(qual, '') || coalesce(with_check, '')) ~ (fn_re || '\(\)')
      AND (coalesce(qual, '') || coalesce(with_check, '')) !~* ('select\s+' || fn_re || '\(\)')
    ORDER BY tablename, policyname
  LOOP
    q := CASE WHEN r.qual IS NULL THEN NULL
         ELSE regexp_replace(r.qual, '\m' || fn_re || '\(\)', '(select \1())', 'g') END;
    w := CASE WHEN r.with_check IS NULL THEN NULL
         ELSE regexp_replace(r.with_check, '\m' || fn_re || '\(\)', '(select \1())', 'g') END;

    stmt := format('ALTER POLICY %I ON public.%I', r.policyname, r.tablename);
    IF q IS NOT NULL THEN stmt := stmt || ' USING (' || q || ')'; END IF;
    IF w IS NOT NULL THEN stmt := stmt || ' WITH CHECK (' || w || ')'; END IF;
    EXECUTE stmt;

    SELECT p.qual, p.with_check INTO nq, nw
    FROM pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename = r.tablename AND p.policyname = r.policyname;

    nq := regexp_replace(nq, '\(\s*SELECT\s+' || fn_re || '\(\)\s+AS\s+[a-z_]+\s*\)', '\1()', 'g');
    nw := regexp_replace(nw, '\(\s*SELECT\s+' || fn_re || '\(\)\s+AS\s+[a-z_]+\s*\)', '\1()', 'g');

    IF nq IS DISTINCT FROM r.qual OR nw IS DISTINCT FROM r.with_check THEN
      RAISE EXCEPTION 'policy % on % mudou além do embrulho; abortando', r.policyname, r.tablename;
    END IF;
    n := n + 1;
  END LOOP;
  RAISE NOTICE 'policies reescritas: %', n;
END
$$;
