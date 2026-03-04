-- Declaração do responsável (confirmação)

ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS guardian_declaration_confirmed boolean NOT NULL DEFAULT false;

-- Garantir que anon possa inserir preenchendo esse campo (já existe students_public_insert).
-- Sem policy extra aqui; o WITH CHECK (true) já permite.
