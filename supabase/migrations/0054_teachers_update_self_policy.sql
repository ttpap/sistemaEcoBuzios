-- Permite que um professor altere o próprio registro na tabela teachers.
-- Antes faltava política UPDATE: o único caminho de escrita era teachers_admin_all
-- (is_admin()), então professor recebia "new row violates row-level security
-- policy for table teachers" ao editar dados (ex.: data de nascimento, dados bancários).
-- Restrito à própria linha via current_teacher_id() em USING e WITH CHECK.

drop policy if exists teachers_update_self on public.teachers;

create policy teachers_update_self on public.teachers
  for update to authenticated
  using (id = current_teacher_id())
  with check (id = current_teacher_id());
