-- Campo livre de situação/detalhe do edital (ex.: "97 pontos", "suplente",
-- "em execução", "captação autorizada") — complementa o status resumido.
alter table public.editais add column if not exists situation text;
