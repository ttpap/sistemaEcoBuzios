-- Permite inscrição pública (sem login) para Professor e Coordenador.
-- ATENÇÃO: Isso torna possível inserir registros via link público.
-- Use apenas se você realmente precisa dessa funcionalidade.

-- teachers: permitir INSERT para anon
DROP POLICY IF EXISTS teachers_public_insert ON public.teachers;
CREATE POLICY teachers_public_insert ON public.teachers
FOR INSERT
TO anon
WITH CHECK (true);

-- coordinators: permitir INSERT para anon
DROP POLICY IF EXISTS coordinators_public_insert ON public.coordinators;
CREATE POLICY coordinators_public_insert ON public.coordinators
FOR INSERT
TO anon
WITH CHECK (true);
