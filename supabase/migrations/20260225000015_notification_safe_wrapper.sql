-- Make the notification helper fail gracefully if pg_net isn't enabled yet.
-- This prevents notification errors from rolling back unrelated transactions
-- (e.g. admin approving a listing, message sends, etc.)

CREATE OR REPLACE FUNCTION _call_notification(payload jsonb)
RETURNS void AS $$
BEGIN
  PERFORM net.http_post(
    url     := 'https://kajbekgezukjhsjnvszu.supabase.co/functions/v1/send-notification',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body    := payload::text
  );
EXCEPTION WHEN OTHERS THEN
  -- Silently swallow errors (e.g. pg_net not enabled, network issues)
  -- so the calling transaction is never rolled back due to notification failure.
  NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
