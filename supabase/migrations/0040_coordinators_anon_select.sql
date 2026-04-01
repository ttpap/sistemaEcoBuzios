-- Permite que o role anon leia coordenadores
-- (coordenadores usam o cliente anon do Supabase)
CREATE POLICY "coordinators_anon_select"
ON public.coordinators
FOR SELECT
TO anon
USING (true);
