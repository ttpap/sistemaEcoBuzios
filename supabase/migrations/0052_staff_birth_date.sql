-- Data de nascimento para professores, coordenadores e administradores (profiles).
-- Coluna opcional: cadastros antigos ficam NULL e recebem aviso no sistema para preencher.

alter table public.teachers add column if not exists birth_date date;
alter table public.coordinators add column if not exists birth_date date;
alter table public.profiles add column if not exists birth_date date;

-- Obs.: a RPC public_staff_signup usa jsonb_populate_record(null::public.teachers, p_row),
-- então a nova coluna birth_date passa a ser aceita automaticamente no cadastro público,
-- sem necessidade de recriar a função.
