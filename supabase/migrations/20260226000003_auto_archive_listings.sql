-- Enable pg_cron extension (requires enabling in Supabase dashboard under Database > Extensions)
create extension if not exists pg_cron;

-- Schedule daily job at midnight to archive listings older than 30 days
select cron.schedule(
  'auto-archive-old-listings',
  '0 0 * * *',
  $$
    update listings
    set status = 'archived'
    where status = 'active'
      and approval_status = 'approved'
      and created_at < now() - interval '30 days';
  $$
);
