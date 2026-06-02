-- Índices em foreign keys sem cobertura.
-- Causa de Disk IO alto: joins por FK sem índice forçam sequential scan na
-- tabela inteira a cada consulta (attendance, justificativas, oficinas etc.).
-- Detectado pelo performance advisor do Supabase (unindexed_foreign_keys).
-- IF NOT EXISTS: idempotente e seguro de re-rodar.

create index if not exists api_keys_created_by_idx
  on public.api_keys (created_by);

create index if not exists attendance_records_student_id_idx
  on public.attendance_records (student_id);

create index if not exists attendance_session_students_student_id_idx
  on public.attendance_session_students (student_id);

create index if not exists class_teachers_teacher_id_idx
  on public.class_teachers (teacher_id);

create index if not exists class_waitlist_student_id_idx
  on public.class_waitlist (student_id);

create index if not exists coordinator_monthly_reports_coordinator_id_idx
  on public.coordinator_monthly_reports (coordinator_id);

create index if not exists coordinator_project_assignments_project_id_idx
  on public.coordinator_project_assignments (project_id);

create index if not exists monthly_reports_positive_student_id_idx
  on public.monthly_reports (positive_student_id);

create index if not exists monthly_reports_reflexive_student_id_idx
  on public.monthly_reports (reflexive_student_id);

create index if not exists monthly_reports_teacher_id_idx
  on public.monthly_reports (teacher_id);

create index if not exists oficina_activity_templates_turma_id_idx
  on public.oficina_activity_templates (turma_id);

create index if not exists oficina_schedule_activities_session_id_idx
  on public.oficina_schedule_activities (session_id);

create index if not exists oficina_schedule_sessions_schedule_id_idx
  on public.oficina_schedule_sessions (schedule_id);

create index if not exists oficina_schedule_sessions_turma_id_idx
  on public.oficina_schedule_sessions (turma_id);

create index if not exists oficina_schedules_project_id_idx
  on public.oficina_schedules (project_id);

create index if not exists photographer_invites_used_photographer_id_idx
  on public.photographer_invites (used_photographer_id);

create index if not exists prestacao_contas_reports_project_id_idx
  on public.prestacao_contas_reports (project_id);

create index if not exists student_justifications_class_id_idx
  on public.student_justifications (class_id);

create index if not exists student_justifications_student_id_idx
  on public.student_justifications (student_id);

create index if not exists teacher_project_assignments_project_id_idx
  on public.teacher_project_assignments (project_id);
