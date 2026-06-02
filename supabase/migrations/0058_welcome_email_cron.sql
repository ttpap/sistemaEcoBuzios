-- Agenda o worker de boas-vindas a cada 5 min (pg_cron + pg_net).
-- A Edge Function drena a fila respeitando o teto diário; sem RESEND_API_KEY
-- (no cofre app_secrets) ela retorna skipped sem efeito.

create extension if not exists pg_net;
create extension if not exists pg_cron;

select cron.unschedule(jobid) from cron.job where jobname = 'send_student_welcome';

select cron.schedule(
  'send_student_welcome',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://ixgujnhdjrgoakqzdkgx.supabase.co/functions/v1/send-student-welcome',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
