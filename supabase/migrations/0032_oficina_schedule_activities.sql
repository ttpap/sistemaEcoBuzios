-- Substitui activity_template_id por schedule_activity_id nas atribuições.
-- Atividades agora são por escala (não mais templates globais por turma).

-- 1. Criar tabela de atividades por escala
CREATE TABLE oficina_schedule_activities (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id      UUID NOT NULL REFERENCES oficina_schedules(id) ON DELETE CASCADE,
  turma_id         UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  duration_minutes INT,
  order_index      INT NOT NULL DEFAULT 0
);

ALTER TABLE oficina_schedule_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all"    ON oficina_schedule_activities FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_select" ON oficina_schedule_activities FOR SELECT TO anon USING (true);
CREATE POLICY "anon_all"    ON oficina_schedule_activities FOR ALL TO anon USING (true) WITH CHECK (true);

-- 2. Adicionar nova coluna em assignments
ALTER TABLE oficina_schedule_assignments
  ADD COLUMN schedule_activity_id UUID REFERENCES oficina_schedule_activities(id) ON DELETE CASCADE;

-- 3. Remover constraint e coluna antiga
ALTER TABLE oficina_schedule_assignments
  DROP CONSTRAINT IF EXISTS oficina_schedule_assignments_session_activity_unique;

ALTER TABLE oficina_schedule_assignments
  DROP COLUMN IF EXISTS activity_template_id;

-- 4. Limpar linhas órfãs (schedule_activity_id ainda NULL)
DELETE FROM oficina_schedule_assignments WHERE schedule_activity_id IS NULL;

-- 5. NOT NULL + nova constraint única
ALTER TABLE oficina_schedule_assignments
  ALTER COLUMN schedule_activity_id SET NOT NULL;

ALTER TABLE oficina_schedule_assignments
  ADD CONSTRAINT oficina_schedule_assignments_session_activity_unique
  UNIQUE (session_id, schedule_activity_id);
