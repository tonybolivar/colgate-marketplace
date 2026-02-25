-- Enforce @colgate.edu email domain at the database level.
-- This trigger fires before any user is inserted into auth.users
-- and rejects the signup if the email doesn't end with @colgate.edu.

CREATE OR REPLACE FUNCTION auth.enforce_colgate_email()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email NOT LIKE '%@colgate.edu' THEN
    RAISE EXCEPTION 'Only @colgate.edu email addresses are permitted to register.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER enforce_colgate_email_trigger
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION auth.enforce_colgate_email();
