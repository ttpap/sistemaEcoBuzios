-- Remove INSERT público (anon) para staff. A criação passa a acontecer via Edge Function com token.

DROP POLICY IF EXISTS teachers_public_insert ON public.teachers;
DROP POLICY IF EXISTS coordinators_public_insert ON public.coordinators;
