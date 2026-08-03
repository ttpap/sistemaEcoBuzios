-- Simplifica o cadastro de editais: código, nome do inscrito e título.
alter table public.editais add column if not exists code text;
alter table public.editais add column if not exists applicant_name text;
