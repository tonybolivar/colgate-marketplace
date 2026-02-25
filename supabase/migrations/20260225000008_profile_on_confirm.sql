-- Replace the trigger so profiles are only created after email confirmation,
-- not immediately on signup. This prevents ghost profiles for unverified users.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- INSERT trigger: only create profile if already confirmed (e.g. OAuth / no email confirm required)
  -- UPDATE trigger: create profile when email_confirmed_at changes from NULL → a value
  IF (TG_OP = 'INSERT' AND NEW.email_confirmed_at IS NOT NULL) OR
     (TG_OP = 'UPDATE' AND OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL) THEN
    INSERT INTO profiles (id, full_name)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name')
    ON CONFLICT (id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the old INSERT-only trigger and add both INSERT and UPDATE triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
