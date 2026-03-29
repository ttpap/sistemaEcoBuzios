-- Template de atividades por turma
CREATE TABLE oficina_activity_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  turma_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  name text NOT NULL,
  duration_minutes int,
  order_index int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Cabeçalho da escala semanal
CREATE TABLE oficina_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  week_number int NOT NULL,
  week_start_date date NOT NULL,
  created_by text,
  created_at timestamptz DEFAULT now()
);

-- Sessão = uma turma em um dia específico da semana
CREATE TABLE oficina_schedule_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL REFERENCES oficina_schedules(id) ON DELETE CASCADE,
  turma_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  date date NOT NULL,
  is_holiday boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Responsável por atividade por sessão (NULL = "Todos")
CREATE TABLE oficina_schedule_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES oficina_schedule_sessions(id) ON DELETE CASCADE,
  activity_template_id uuid NOT NULL REFERENCES oficina_activity_templates(id) ON DELETE CASCADE,
  teacher_id uuid REFERENCES teachers(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE oficina_activity_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE oficina_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE oficina_schedule_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE oficina_schedule_assignments ENABLE ROW LEVEL SECURITY;

-- Admin autenticado tem acesso total
CREATE POLICY "Admin full access on oficina_activity_templates"
  ON oficina_activity_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access on oficina_schedules"
  ON oficina_schedules FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access on oficina_schedule_sessions"
  ON oficina_schedule_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access on oficina_schedule_assignments"
  ON oficina_schedule_assignments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Leitura anônima (coordenadores Modo B)
CREATE POLICY "Anon read oficina_activity_templates"
  ON oficina_activity_templates FOR SELECT TO anon USING (true);
CREATE POLICY "Anon read oficina_schedules"
  ON oficina_schedules FOR SELECT TO anon USING (true);
CREATE POLICY "Anon read oficina_schedule_sessions"
  ON oficina_schedule_sessions FOR SELECT TO anon USING (true);
CREATE POLICY "Anon read oficina_schedule_assignments"
  ON oficina_schedule_assignments FOR SELECT TO anon USING (true);

-- Escrita anônima (coordenadores Modo B)
CREATE POLICY "Anon write oficina_activity_templates"
  ON oficina_activity_templates FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon write oficina_schedules"
  ON oficina_schedules FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon write oficina_schedule_sessions"
  ON oficina_schedule_sessions FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon write oficina_schedule_assignments"
  ON oficina_schedule_assignments FOR ALL TO anon USING (true) WITH CHECK (true);
