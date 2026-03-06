-- Documenta a dependência do segredo de convite para links públicos de staff.
-- Este arquivo não cria secrets (isso é feito nas configurações do projeto).
--
-- Required Edge Function secret:
--   STAFF_PUBLIC_INVITE_SECRET
--
-- The following Edge Functions depend on it:
--   - public-staff-invite
--   - public-staff-signup

SELECT 1;
