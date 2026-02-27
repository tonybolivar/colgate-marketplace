-- Enable pg_net for HTTP calls from cron
create extension if not exists pg_net;

-- Schedule daily expiry reminder email at midnight UTC
-- IMPORTANT: Replace <PROJECT_REF> and <SERVICE_ROLE_KEY> before running this migration.
-- <PROJECT_REF>: Found in Supabase dashboard > Project Settings > General
-- <SERVICE_ROLE_KEY>: Found in Supabase dashboard > Project Settings > API
select cron.schedule(
  'expiry-reminders-daily',
  '0 0 * * *',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/expiry-reminders',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer <SERVICE_ROLE_KEY>"}'::jsonb,
    body := '{}'::jsonb
  )
  $$
);
