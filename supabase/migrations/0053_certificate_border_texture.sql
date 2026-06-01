-- Textura/moldura opcional para a borda do certificado (data URL base64).
alter table public.certificate_configs add column if not exists border_texture text;
