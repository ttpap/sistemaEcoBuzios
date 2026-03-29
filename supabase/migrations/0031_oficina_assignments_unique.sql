-- Adiciona constraint UNIQUE necessária para upsert de assignments
ALTER TABLE oficina_schedule_assignments
  ADD CONSTRAINT oficina_schedule_assignments_session_activity_unique
  UNIQUE (session_id, activity_template_id);
