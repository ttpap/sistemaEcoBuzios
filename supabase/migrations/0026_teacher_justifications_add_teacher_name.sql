-- Adiciona coluna teacher_name na tabela teacher_justifications
-- para que o nome do professor seja armazenado diretamente na justificativa,
-- sem depender de join ou acesso à tabela teachers (que é restrita ao role authenticated).

ALTER TABLE public.teacher_justifications ADD COLUMN IF NOT EXISTS teacher_name text;
