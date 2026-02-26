-- Fix admin RLS policies by using a SECURITY DEFINER function.
-- This avoids potential recursion when profiles policies reference profiles.

CREATE OR REPLACE FUNCTION auth_is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()),
    false
  )
$$;

-- Listings: drop and recreate admin update policy
DROP POLICY IF EXISTS "Admins can update listings" ON public.listings;
CREATE POLICY "Admins can update listings"
  ON public.listings FOR UPDATE TO authenticated
  USING (auth_is_admin())
  WITH CHECK (auth_is_admin());

-- Listings: drop and recreate admin delete policy
DROP POLICY IF EXISTS "Admins can delete listings" ON public.listings;
CREATE POLICY "Admins can delete listings"
  ON public.listings FOR DELETE TO authenticated
  USING (auth_is_admin());

-- Profiles: drop and recreate admin update policy
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth_is_admin())
  WITH CHECK (auth_is_admin());

-- View policy: also use the function so SELECT is consistent
DROP POLICY IF EXISTS "Authenticated users can view listings" ON public.listings;
CREATE POLICY "Authenticated users can view listings"
  ON public.listings FOR SELECT TO authenticated
  USING (
    (status = 'active' AND approval_status = 'approved')
    OR seller_id = auth.uid()
    OR sold_to_buyer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM conversations c WHERE c.listing_id = id AND c.buyer_id = auth.uid())
    OR auth_is_admin()
  );
