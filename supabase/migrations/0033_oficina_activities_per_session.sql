-- Atividades agora são por sessão (turma × dia), não mais por escala+turma.
-- Cada célula da grade tem sua própria lista independente de atividades + professor.

-- 1. Remover tabelas antigas
DROP TABLE IF EXISTS oficina_schedule_assignments;
DROP TABLE IF EXISTS oficina_schedule_activities;

-- 2. Criar nova tabela de atividades por sessão
CREATE TABLE oficina_schedule_activities (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id       UUID NOT NULL REFERENCES oficina_schedule_sessions(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  duration_minutes INT,
  order_index      INT NOT NULL DEFAULT 0,
  teacher_id       UUID  -- NULL = "Todos"
);

ALTER TABLE oficina_schedule_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all" ON oficina_schedule_activities FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON oficina_schedule_activities FOR ALL TO anon  USING (true) WITH CHECK (true);
