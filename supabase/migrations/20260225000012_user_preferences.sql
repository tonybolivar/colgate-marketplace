-- Store per-user notification preferences and theme preference
ALTER TABLE public.profiles
  ADD COLUMN notification_settings JSONB NOT NULL DEFAULT
    '{"message_received": true, "listing_approved": true, "new_listing": false, "review_received": true}'::jsonb;

ALTER TABLE public.profiles
  ADD COLUMN theme_preference TEXT NOT NULL DEFAULT 'light'
  CHECK (theme_preference IN ('light', 'dark'));
