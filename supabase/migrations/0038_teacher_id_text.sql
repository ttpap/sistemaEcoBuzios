-- Permite múltiplos professores por atividade.
-- Altera teacher_id de UUID para TEXT (IDs separados por vírgula, NULL = "Todos").

ALTER TABLE oficina_schedule_activities
  ALTER COLUMN teacher_id TYPE TEXT;
