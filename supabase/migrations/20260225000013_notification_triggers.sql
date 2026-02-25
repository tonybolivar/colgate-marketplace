-- Enable pg_net for HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net;

-- RPC for edge function to get emails of users who want new-listing notifications
CREATE OR REPLACE FUNCTION get_new_listing_recipients(p_seller_id UUID)
RETURNS TABLE (email TEXT) AS $$
  SELECT u.email
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE p.id != p_seller_id
    AND (p.notification_settings->>'new_listing')::boolean = true
    AND u.email IS NOT NULL
    AND u.email_confirmed_at IS NOT NULL
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper: fire the edge function
CREATE OR REPLACE FUNCTION _call_notification(payload jsonb)
RETURNS void AS $$
BEGIN
  PERFORM net.http_post(
    url     := 'https://pxqurhzraduodjnnjrxt.supabase.co/functions/v1/send-notification',
    headers := '{"Content-Type": "application/json", "x-trigger-secret": "colgate-mkt-2026-secret"}'::jsonb,
    body    := payload::text
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: new message → notify the other participant
CREATE OR REPLACE FUNCTION trg_notify_message()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM _call_notification(
    json_build_object('type', 'message_received', 'id', NEW.id)::jsonb
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_new_message
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION trg_notify_message();

-- Trigger: listing approved → notify seller + broadcast new-listing
CREATE OR REPLACE FUNCTION trg_notify_listing_approved()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.approval_status IS DISTINCT FROM 'approved' AND NEW.approval_status = 'approved' THEN
    PERFORM _call_notification(
      json_build_object('type', 'listing_approved', 'id', NEW.id)::jsonb
    );
    PERFORM _call_notification(
      json_build_object('type', 'new_listing', 'id', NEW.id)::jsonb
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_listing_approved
  AFTER UPDATE ON listings
  FOR EACH ROW EXECUTE FUNCTION trg_notify_listing_approved();

-- Trigger: new review → notify seller
CREATE OR REPLACE FUNCTION trg_notify_review()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM _call_notification(
    json_build_object('type', 'review_received', 'id', NEW.id)::jsonb
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_new_review
  AFTER INSERT ON reviews
  FOR EACH ROW EXECUTE FUNCTION trg_notify_review();
