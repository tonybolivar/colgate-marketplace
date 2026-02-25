-- Store the reason when an admin warns a user
ALTER TABLE public.profiles ADD COLUMN warn_reason TEXT;
