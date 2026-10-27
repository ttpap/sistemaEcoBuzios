-- ROLLBACK de 2026-10-27 (diagnóstico Disk IO) — gerado ANTES de qualquer alteração
-- Estado capturado em: 2026-10-27T09:56:21.757336+00:00
-- Contém: (1) texto original de public.public_perfil_stats, (2) texto original das policies RLS que usam is_admin()/current_*_id()/auth.uid().
-- Reverter = rodar este arquivo inteiro. ALTER POLICY não altera roles/cmd; só USING/WITH CHECK.
-- ACL original da função: {postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}

begin;

-- (1) função original
CREATE OR REPLACE FUNCTION public.public_perfil_stats(p_project_ids uuid[] DEFAULT NULL::uuid[], p_ate date DEFAULT NULL::date)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_ate date := coalesce(p_ate, current_date);
  v_projetos uuid[];
  v_geral jsonb;
  v_por_projeto jsonb;
  v_soma int;
BEGIN
  SELECT coalesce(array_agg(p.id), '{}') INTO v_projetos
  FROM public.projects p
  WHERE (p.finalized_at IS NULL OR p.finalized_at::date > v_ate)
    AND (p_project_ids IS NULL OR array_length(p_project_ids, 1) IS NULL OR p.id = ANY(p_project_ids));

  CREATE TEMP TABLE IF NOT EXISTS _perfil_matriculas (project_id uuid, student_id uuid) ON COMMIT DROP;
  TRUNCATE _perfil_matriculas;

  INSERT INTO _perfil_matriculas
  SELECT DISTINCT c.project_id, cse.student_id
  FROM public.class_student_enrollments cse
  JOIN public.classes c ON c.id = cse.class_id
  WHERE c.project_id = ANY(v_projetos)
    AND cse.enrolled_at::date <= v_ate
    AND (cse.removed_at IS NULL OR cse.removed_at::date > v_ate);

  v_geral := public.perfil_recortes(
    (SELECT coalesce(array_agg(DISTINCT student_id), '{}') FROM _perfil_matriculas), v_ate)
    || jsonb_build_object('saidas_por_mes', public.movimento_mensal(v_projetos, v_ate));

  SELECT coalesce(jsonb_agg(
           jsonb_build_object('id', p.id, 'name', p.name, 'value', x.n)
           || public.perfil_recortes(x.ids, v_ate)
           || jsonb_build_object('saidas_por_mes', public.movimento_mensal(ARRAY[p.id], v_ate))
           ORDER BY x.n DESC, p.name), '[]'::jsonb),
         coalesce(sum(x.n), 0)
    INTO v_por_projeto, v_soma
  FROM (SELECT project_id, count(*)::int AS n, array_agg(student_id) AS ids
        FROM _perfil_matriculas GROUP BY project_id) x
  JOIN public.projects p ON p.id = x.project_id;

  RETURN (jsonb_build_object(
    'data_corte', v_ate,
    'alunos_unicos', (v_geral->>'total_alunos')::int,
    'total_matriculas_por_projeto', v_soma
  ) || v_geral || jsonb_build_object('por_projeto', v_por_projeto))::json;
END;
$function$;

-- (2) policies originais (63)
-- api_keys / api_keys_admin_all (ALL, roles ['authenticated'])
alter policy "api_keys_admin_all" on public."api_keys"
  using (is_admin())
  with check (is_admin());

-- attendance_records / attendance_records_admin_all (ALL, roles ['public'])
alter policy "attendance_records_admin_all" on public."attendance_records"
  using (is_admin())
  with check (is_admin());

-- attendance_records / attendance_records_select_role (SELECT, roles ['public'])
alter policy "attendance_records_select_role" on public."attendance_records"
  using ((is_admin() OR (EXISTS ( SELECT 1
   FROM attendance_sessions s
  WHERE ((s.id = attendance_records.session_id) AND _project_active(s.project_id) AND ((EXISTS ( SELECT 1
           FROM teacher_project_assignments tpa
          WHERE ((tpa.teacher_id = current_teacher_id()) AND (tpa.project_id = s.project_id)))) OR (EXISTS ( SELECT 1
           FROM coordinator_project_assignments cpa
          WHERE ((cpa.coordinator_id = current_coordinator_id()) AND (cpa.project_id = s.project_id)))) OR (attendance_records.student_id = current_student_id())))))));

-- attendance_records / attendance_records_write_role (ALL, roles ['public'])
alter policy "attendance_records_write_role" on public."attendance_records"
  using ((is_admin() OR (EXISTS ( SELECT 1
   FROM attendance_sessions s
  WHERE ((s.id = attendance_records.session_id) AND _project_active(s.project_id) AND ((EXISTS ( SELECT 1
           FROM teacher_project_assignments tpa
          WHERE ((tpa.teacher_id = current_teacher_id()) AND (tpa.project_id = s.project_id)))) OR (EXISTS ( SELECT 1
           FROM coordinator_project_assignments cpa
          WHERE ((cpa.coordinator_id = current_coordinator_id()) AND (cpa.project_id = s.project_id))))))))))
  with check ((is_admin() OR (EXISTS ( SELECT 1
   FROM attendance_sessions s
  WHERE ((s.id = attendance_records.session_id) AND _project_active(s.project_id) AND ((EXISTS ( SELECT 1
           FROM teacher_project_assignments tpa
          WHERE ((tpa.teacher_id = current_teacher_id()) AND (tpa.project_id = s.project_id)))) OR (EXISTS ( SELECT 1
           FROM coordinator_project_assignments cpa
          WHERE ((cpa.coordinator_id = current_coordinator_id()) AND (cpa.project_id = s.project_id))))))))));

-- attendance_session_students / attendance_session_students_admin_all (ALL, roles ['authenticated'])
alter policy "attendance_session_students_admin_all" on public."attendance_session_students"
  using (is_admin())
  with check (is_admin());

-- attendance_session_students / attendance_session_students_select_role (SELECT, roles ['authenticated'])
alter policy "attendance_session_students_select_role" on public."attendance_session_students"
  using ((is_admin() OR (EXISTS ( SELECT 1
   FROM attendance_sessions s
  WHERE ((s.id = attendance_session_students.session_id) AND ((EXISTS ( SELECT 1
           FROM teacher_project_assignments tpa
          WHERE ((tpa.teacher_id = current_teacher_id()) AND (tpa.project_id = s.project_id)))) OR (EXISTS ( SELECT 1
           FROM coordinator_project_assignments cpa
          WHERE ((cpa.coordinator_id = current_coordinator_id()) AND (cpa.project_id = s.project_id)))) OR (attendance_session_students.student_id = current_student_id())))))));

-- attendance_session_students / attendance_session_students_write_role (ALL, roles ['authenticated'])
alter policy "attendance_session_students_write_role" on public."attendance_session_students"
  using ((is_admin() OR (EXISTS ( SELECT 1
   FROM attendance_sessions s
  WHERE ((s.id = attendance_session_students.session_id) AND ((EXISTS ( SELECT 1
           FROM teacher_project_assignments tpa
          WHERE ((tpa.teacher_id = current_teacher_id()) AND (tpa.project_id = s.project_id)))) OR (EXISTS ( SELECT 1
           FROM coordinator_project_assignments cpa
          WHERE ((cpa.coordinator_id = current_coordinator_id()) AND (cpa.project_id = s.project_id))))))))))
  with check ((is_admin() OR (EXISTS ( SELECT 1
   FROM attendance_sessions s
  WHERE ((s.id = attendance_session_students.session_id) AND ((EXISTS ( SELECT 1
           FROM teacher_project_assignments tpa
          WHERE ((tpa.teacher_id = current_teacher_id()) AND (tpa.project_id = s.project_id)))) OR (EXISTS ( SELECT 1
           FROM coordinator_project_assignments cpa
          WHERE ((cpa.coordinator_id = current_coordinator_id()) AND (cpa.project_id = s.project_id))))))))));

-- attendance_sessions / attendance_sessions_admin_all (ALL, roles ['public'])
alter policy "attendance_sessions_admin_all" on public."attendance_sessions"
  using (is_admin())
  with check (is_admin());

-- attendance_sessions / attendance_sessions_select_role (SELECT, roles ['public'])
alter policy "attendance_sessions_select_role" on public."attendance_sessions"
  using ((_project_active(project_id) AND (is_admin() OR (EXISTS ( SELECT 1
   FROM teacher_project_assignments tpa
  WHERE ((tpa.teacher_id = current_teacher_id()) AND (tpa.project_id = attendance_sessions.project_id)))) OR (EXISTS ( SELECT 1
   FROM coordinator_project_assignments cpa
  WHERE ((cpa.coordinator_id = current_coordinator_id()) AND (cpa.project_id = attendance_sessions.project_id)))) OR (EXISTS ( SELECT 1
   FROM class_student_enrollments cse
  WHERE ((cse.class_id = attendance_sessions.class_id) AND (cse.student_id = current_student_id()) AND (cse.removed_at IS NULL)))))));

-- attendance_sessions / attendance_sessions_write_role (ALL, roles ['public'])
alter policy "attendance_sessions_write_role" on public."attendance_sessions"
  using ((_project_active(project_id) AND (is_admin() OR (EXISTS ( SELECT 1
   FROM teacher_project_assignments tpa
  WHERE ((tpa.teacher_id = current_teacher_id()) AND (tpa.project_id = attendance_sessions.project_id)))) OR (EXISTS ( SELECT 1
   FROM coordinator_project_assignments cpa
  WHERE ((cpa.coordinator_id = current_coordinator_id()) AND (cpa.project_id = attendance_sessions.project_id)))))))
  with check ((_project_active(project_id) AND (is_admin() OR (EXISTS ( SELECT 1
   FROM teacher_project_assignments tpa
  WHERE ((tpa.teacher_id = current_teacher_id()) AND (tpa.project_id = attendance_sessions.project_id)))) OR (EXISTS ( SELECT 1
   FROM coordinator_project_assignments cpa
  WHERE ((cpa.coordinator_id = current_coordinator_id()) AND (cpa.project_id = attendance_sessions.project_id)))))));

-- class_student_enrollments / cse_admin_all (ALL, roles ['public'])
alter policy "cse_admin_all" on public."class_student_enrollments"
  using (is_admin())
  with check (is_admin());

-- class_student_enrollments / cse_select_assigned (SELECT, roles ['public'])
alter policy "cse_select_assigned" on public."class_student_enrollments"
  using ((_project_active(project_id_for_class(class_id)) AND (is_admin() OR (student_id = current_student_id()) OR is_teacher_assigned_to_project(project_id_for_class(class_id)) OR is_coordinator_assigned_to_project(project_id_for_class(class_id)))));

-- class_student_enrollments / cse_write_assigned (ALL, roles ['public'])
alter policy "cse_write_assigned" on public."class_student_enrollments"
  using ((_project_active(project_id_for_class(class_id)) AND (is_admin() OR is_teacher_assigned_to_project(project_id_for_class(class_id)) OR is_coordinator_assigned_to_project(project_id_for_class(class_id)))))
  with check ((_project_active(project_id_for_class(class_id)) AND (is_admin() OR is_teacher_assigned_to_project(project_id_for_class(class_id)) OR is_coordinator_assigned_to_project(project_id_for_class(class_id)))));

-- class_teachers / class_teachers_admin_all (ALL, roles ['authenticated'])
alter policy "class_teachers_admin_all" on public."class_teachers"
  using (is_admin())
  with check (is_admin());

-- class_teachers / class_teachers_select_assigned (SELECT, roles ['authenticated'])
alter policy "class_teachers_select_assigned" on public."class_teachers"
  using ((is_admin() OR (EXISTS ( SELECT 1
   FROM classes c
  WHERE ((c.id = class_teachers.class_id) AND ((EXISTS ( SELECT 1
           FROM teacher_project_assignments tpa
          WHERE ((tpa.teacher_id = current_teacher_id()) AND (tpa.project_id = c.project_id)))) OR (EXISTS ( SELECT 1
           FROM coordinator_project_assignments cpa
          WHERE ((cpa.coordinator_id = current_coordinator_id()) AND (cpa.project_id = c.project_id))))))))));

-- class_teachers / class_teachers_write_assigned (ALL, roles ['authenticated'])
alter policy "class_teachers_write_assigned" on public."class_teachers"
  using ((is_admin() OR (EXISTS ( SELECT 1
   FROM classes c
  WHERE ((c.id = class_teachers.class_id) AND ((EXISTS ( SELECT 1
           FROM teacher_project_assignments tpa
          WHERE ((tpa.teacher_id = current_teacher_id()) AND (tpa.project_id = c.project_id)))) OR (EXISTS ( SELECT 1
           FROM coordinator_project_assignments cpa
          WHERE ((cpa.coordinator_id = current_coordinator_id()) AND (cpa.project_id = c.project_id))))))))))
  with check ((is_admin() OR (EXISTS ( SELECT 1
   FROM classes c
  WHERE ((c.id = class_teachers.class_id) AND ((EXISTS ( SELECT 1
           FROM teacher_project_assignments tpa
          WHERE ((tpa.teacher_id = current_teacher_id()) AND (tpa.project_id = c.project_id)))) OR (EXISTS ( SELECT 1
           FROM coordinator_project_assignments cpa
          WHERE ((cpa.coordinator_id = current_coordinator_id()) AND (cpa.project_id = c.project_id))))))))));

-- class_waitlist / waitlist_admin_all (ALL, roles ['authenticated'])
alter policy "waitlist_admin_all" on public."class_waitlist"
  using (is_admin())
  with check (is_admin());

-- class_waitlist / waitlist_select_assigned (SELECT, roles ['authenticated'])
alter policy "waitlist_select_assigned" on public."class_waitlist"
  using ((_project_active(project_id_for_class(class_id)) AND (is_admin() OR is_teacher_assigned_to_project(project_id_for_class(class_id)) OR is_coordinator_assigned_to_project(project_id_for_class(class_id)))));

-- class_waitlist / waitlist_write_assigned (ALL, roles ['authenticated'])
alter policy "waitlist_write_assigned" on public."class_waitlist"
  using ((_project_active(project_id_for_class(class_id)) AND (is_admin() OR is_teacher_assigned_to_project(project_id_for_class(class_id)) OR is_coordinator_assigned_to_project(project_id_for_class(class_id)))))
  with check ((_project_active(project_id_for_class(class_id)) AND (is_admin() OR is_teacher_assigned_to_project(project_id_for_class(class_id)) OR is_coordinator_assigned_to_project(project_id_for_class(class_id)))));

-- classes / classes_admin_all (ALL, roles ['public'])
alter policy "classes_admin_all" on public."classes"
  using (is_admin())
  with check (is_admin());

-- classes / classes_select_assigned (SELECT, roles ['public'])
alter policy "classes_select_assigned" on public."classes"
  using ((_project_active(project_id) AND (is_admin() OR is_teacher_assigned_to_project(project_id) OR is_coordinator_assigned_to_project(project_id) OR is_current_student_enrolled_in_class(id))));

-- classes / classes_write_assigned (ALL, roles ['public'])
alter policy "classes_write_assigned" on public."classes"
  using ((_project_active(project_id) AND (is_admin() OR is_teacher_assigned_to_project(project_id) OR is_coordinator_assigned_to_project(project_id))))
  with check ((_project_active(project_id) AND (is_admin() OR is_teacher_assigned_to_project(project_id) OR is_coordinator_assigned_to_project(project_id))));

-- coordinator_monthly_reports / coordinator_monthly_reports_admin_all (ALL, roles ['authenticated'])
alter policy "coordinator_monthly_reports_admin_all" on public."coordinator_monthly_reports"
  using (is_admin())
  with check (is_admin());

-- coordinator_monthly_reports / coordinator_monthly_reports_select_role (SELECT, roles ['authenticated'])
alter policy "coordinator_monthly_reports_select_role" on public."coordinator_monthly_reports"
  using ((is_admin() OR (coordinator_id = current_coordinator_id())));

-- coordinator_monthly_reports / coordinator_monthly_reports_write_own (ALL, roles ['authenticated'])
alter policy "coordinator_monthly_reports_write_own" on public."coordinator_monthly_reports"
  using ((is_admin() OR (coordinator_id = current_coordinator_id())))
  with check ((is_admin() OR (coordinator_id = current_coordinator_id())));

-- coordinator_project_assignments / coordinator_project_assignments_admin_all (ALL, roles ['authenticated'])
alter policy "coordinator_project_assignments_admin_all" on public."coordinator_project_assignments"
  using (is_admin())
  with check (is_admin());

-- coordinator_project_assignments / coordinator_project_assignments_select_own (SELECT, roles ['authenticated'])
alter policy "coordinator_project_assignments_select_own" on public."coordinator_project_assignments"
  using ((is_admin() OR (coordinator_id = current_coordinator_id())));

-- coordinators / coordinators_admin_all (ALL, roles ['authenticated'])
alter policy "coordinators_admin_all" on public."coordinators"
  using (is_admin())
  with check (is_admin());

-- coordinators / coordinators_select_role (SELECT, roles ['authenticated'])
alter policy "coordinators_select_role" on public."coordinators"
  using ((is_admin() OR (id = current_coordinator_id())));

-- editais / admin_all_editais (ALL, roles ['authenticated'])
alter policy "admin_all_editais" on public."editais"
  using ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.user_id = auth.uid()) AND (p.role = 'admin'::app_role)))))
  with check ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.user_id = auth.uid()) AND (p.role = 'admin'::app_role)))));

-- expenses / expenses_admin_all (ALL, roles ['authenticated'])
alter policy "expenses_admin_all" on public."expenses"
  using (is_admin())
  with check (is_admin());

-- monthly_reports / monthly_reports_admin_all (ALL, roles ['authenticated'])
alter policy "monthly_reports_admin_all" on public."monthly_reports"
  using (is_admin())
  with check (is_admin());

-- monthly_reports / monthly_reports_select_role (SELECT, roles ['authenticated'])
alter policy "monthly_reports_select_role" on public."monthly_reports"
  using ((is_admin() OR (teacher_id = current_teacher_id()) OR (EXISTS ( SELECT 1
   FROM coordinator_project_assignments cpa
  WHERE ((cpa.coordinator_id = current_coordinator_id()) AND (cpa.project_id = monthly_reports.project_id))))));

-- monthly_reports / monthly_reports_write_own (ALL, roles ['authenticated'])
alter policy "monthly_reports_write_own" on public."monthly_reports"
  using ((is_admin() OR (teacher_id = current_teacher_id())))
  with check ((is_admin() OR (teacher_id = current_teacher_id())));

-- photo_links / photo_links_admin_all (ALL, roles ['authenticated'])
alter policy "photo_links_admin_all" on public."photo_links"
  using ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.user_id = auth.uid()) AND (p.role = 'admin'::app_role)))))
  with check ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.user_id = auth.uid()) AND (p.role = 'admin'::app_role)))));

-- photographer_invites / photographer_invites_admin_all (ALL, roles ['authenticated'])
alter policy "photographer_invites_admin_all" on public."photographer_invites"
  using ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.user_id = auth.uid()) AND (p.role = 'admin'::app_role)))))
  with check ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.user_id = auth.uid()) AND (p.role = 'admin'::app_role)))));

-- photographer_project_assignments / photographer_assignments_admin_all (ALL, roles ['authenticated'])
alter policy "photographer_assignments_admin_all" on public."photographer_project_assignments"
  using ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.user_id = auth.uid()) AND (p.role = 'admin'::app_role)))))
  with check ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.user_id = auth.uid()) AND (p.role = 'admin'::app_role)))));

-- photographers / photographers_admin_all (ALL, roles ['authenticated'])
alter policy "photographers_admin_all" on public."photographers"
  using ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.user_id = auth.uid()) AND (p.role = 'admin'::app_role)))))
  with check ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.user_id = auth.uid()) AND (p.role = 'admin'::app_role)))));

-- prestacao_contas_reports / admin_all (ALL, roles ['authenticated'])
alter policy "admin_all" on public."prestacao_contas_reports"
  using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((prestacao_contas_reports.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::app_role, 'coordinator'::app_role]))))))
  with check ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((prestacao_contas_reports.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::app_role, 'coordinator'::app_role]))))));

-- profiles / profiles_admin_all (ALL, roles ['authenticated'])
alter policy "profiles_admin_all" on public."profiles"
  using (is_admin())
  with check (is_admin());

-- profiles / profiles_select_own (SELECT, roles ['public'])
alter policy "profiles_select_own" on public."profiles"
  using ((auth.uid() = user_id));

-- projects / projects_admin_all (ALL, roles ['authenticated'])
alter policy "projects_admin_all" on public."projects"
  using (is_admin())
  with check (is_admin());

-- projects / projects_select_assigned (SELECT, roles ['authenticated'])
alter policy "projects_select_assigned" on public."projects"
  using ((is_admin() OR is_teacher_assigned_to_project(id) OR is_coordinator_assigned_to_project(id) OR is_current_student_enrolled_in_project(id)));

-- staff_invites / admin_manage (ALL, roles ['authenticated'])
alter policy "admin_manage" on public."staff_invites"
  using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((staff_invites.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::app_role, 'coordinator'::app_role]))))))
  with check ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((staff_invites.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::app_role, 'coordinator'::app_role]))))));

-- student_justifications / student_justifications_admin_all (ALL, roles ['authenticated'])
alter policy "student_justifications_admin_all" on public."student_justifications"
  using (is_admin())
  with check (is_admin());

-- student_justifications / student_justifications_insert_own (INSERT, roles ['authenticated'])
alter policy "student_justifications_insert_own" on public."student_justifications"
  with check ((student_id = current_student_id()));

-- student_justifications / student_justifications_select_role (SELECT, roles ['authenticated'])
alter policy "student_justifications_select_role" on public."student_justifications"
  using ((is_admin() OR (student_id = current_student_id()) OR (EXISTS ( SELECT 1
   FROM teacher_project_assignments tpa
  WHERE ((tpa.teacher_id = current_teacher_id()) AND (tpa.project_id = student_justifications.project_id)))) OR (EXISTS ( SELECT 1
   FROM coordinator_project_assignments cpa
  WHERE ((cpa.coordinator_id = current_coordinator_id()) AND (cpa.project_id = student_justifications.project_id))))));

-- student_justifications / student_justifications_update_own (UPDATE, roles ['authenticated'])
alter policy "student_justifications_update_own" on public."student_justifications"
  using ((is_admin() OR (student_id = current_student_id())))
  with check ((is_admin() OR (student_id = current_student_id())));

-- student_photos / student_photos_admin_all (ALL, roles ['authenticated'])
alter policy "student_photos_admin_all" on public."student_photos"
  using (is_admin())
  with check (is_admin());

-- student_photos / student_photos_select_assigned (SELECT, roles ['authenticated'])
alter policy "student_photos_select_assigned" on public."student_photos"
  using ((is_admin() OR (student_id = current_student_id()) OR (EXISTS ( SELECT 1
   FROM (class_student_enrollments e
     JOIN classes c ON ((c.id = e.class_id)))
  WHERE ((e.student_id = student_photos.student_id) AND (is_teacher_assigned_to_project(c.project_id) OR is_coordinator_assigned_to_project(c.project_id)))))));

-- student_welcome_emails / welcome_emails_admin_all (ALL, roles ['authenticated'])
alter policy "welcome_emails_admin_all" on public."student_welcome_emails"
  using (is_admin())
  with check (is_admin());

-- students / students_admin_all (ALL, roles ['authenticated'])
alter policy "students_admin_all" on public."students"
  using (is_admin())
  with check (is_admin());

-- students / students_select_role (SELECT, roles ['authenticated'])
alter policy "students_select_role" on public."students"
  using ((is_admin() OR (id = current_student_id()) OR (EXISTS ( SELECT 1
   FROM (class_student_enrollments cse
     JOIN classes c ON ((c.id = cse.class_id)))
  WHERE ((cse.student_id = students.id) AND (cse.removed_at IS NULL) AND ((EXISTS ( SELECT 1
           FROM teacher_project_assignments tpa
          WHERE ((tpa.teacher_id = current_teacher_id()) AND (tpa.project_id = c.project_id)))) OR (EXISTS ( SELECT 1
           FROM coordinator_project_assignments cpa
          WHERE ((cpa.coordinator_id = current_coordinator_id()) AND (cpa.project_id = c.project_id))))))))));

-- students / students_update_own (UPDATE, roles ['authenticated'])
alter policy "students_update_own" on public."students"
  using ((is_admin() OR (id = current_student_id())))
  with check ((is_admin() OR (id = current_student_id())));

-- teacher_project_assignments / teacher_project_assignments_admin_all (ALL, roles ['authenticated'])
alter policy "teacher_project_assignments_admin_all" on public."teacher_project_assignments"
  using (is_admin())
  with check (is_admin());

-- teacher_project_assignments / teacher_project_assignments_delete_coordinator_projects (DELETE, roles ['authenticated'])
alter policy "teacher_project_assignments_delete_coordinator_projects" on public."teacher_project_assignments"
  using ((is_admin() OR is_coordinator_assigned_to_project(project_id)));

-- teacher_project_assignments / teacher_project_assignments_insert_coordinator_projects (INSERT, roles ['authenticated'])
alter policy "teacher_project_assignments_insert_coordinator_projects" on public."teacher_project_assignments"
  with check ((is_admin() OR is_coordinator_assigned_to_project(project_id)));

-- teacher_project_assignments / teacher_project_assignments_select_coordinator_projects (SELECT, roles ['authenticated'])
alter policy "teacher_project_assignments_select_coordinator_projects" on public."teacher_project_assignments"
  using ((is_admin() OR is_coordinator_assigned_to_project(project_id)));

-- teacher_project_assignments / teacher_project_assignments_select_own (SELECT, roles ['authenticated'])
alter policy "teacher_project_assignments_select_own" on public."teacher_project_assignments"
  using ((is_admin() OR (teacher_id = current_teacher_id())));

-- teachers / teachers_admin_all (ALL, roles ['authenticated'])
alter policy "teachers_admin_all" on public."teachers"
  using (is_admin())
  with check (is_admin());

-- teachers / teachers_select_by_teacher (SELECT, roles ['authenticated'])
alter policy "teachers_select_by_teacher" on public."teachers"
  using ((current_teacher_id() IS NOT NULL));

-- teachers / teachers_select_role (SELECT, roles ['authenticated'])
alter policy "teachers_select_role" on public."teachers"
  using ((is_admin() OR (id = current_teacher_id()) OR (EXISTS ( SELECT 1
   FROM teacher_project_assignments tpa
  WHERE ((tpa.teacher_id = teachers.id) AND (EXISTS ( SELECT 1
           FROM coordinator_project_assignments cpa
          WHERE ((cpa.coordinator_id = current_coordinator_id()) AND (cpa.project_id = tpa.project_id)))))))));

-- teachers / teachers_update_self (UPDATE, roles ['authenticated'])
alter policy "teachers_update_self" on public."teachers"
  using ((id = current_teacher_id()))
  with check ((id = current_teacher_id()));

commit;
