-- Permite que coordenadores gerenciem (SELECT/INSERT/DELETE) as alocações de professores
-- SOMENTE dentro dos projetos em que o coordenador está alocado.

-- SELECT: coordenador pode ver alocações de professores em seus projetos
DROP POLICY IF EXISTS teacher_project_assignments_select_coordinator_projects ON public.teacher_project_assignments;
CREATE POLICY teacher_project_assignments_select_coordinator_projects
ON public.teacher_project_assignments
FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR public.is_coordinator_assigned_to_project(project_id)
);

-- INSERT: coordenador pode alocar professor em projeto que ele coordena
DROP POLICY IF EXISTS teacher_project_assignments_insert_coordinator_projects ON public.teacher_project_assignments;
CREATE POLICY teacher_project_assignments_insert_coordinator_projects
ON public.teacher_project_assignments
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin()
  OR public.is_coordinator_assigned_to_project(project_id)
);

-- DELETE: coordenador pode remover alocação em projeto que ele coordena
DROP POLICY IF EXISTS teacher_project_assignments_delete_coordinator_projects ON public.teacher_project_assignments;
CREATE POLICY teacher_project_assignments_delete_coordinator_projects
ON public.teacher_project_assignments
FOR DELETE
TO authenticated
USING (
  public.is_admin()
  OR public.is_coordinator_assigned_to_project(project_id)
);
