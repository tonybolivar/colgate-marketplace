-- Add approval_status to listings
ALTER TABLE listings
  ADD COLUMN approval_status TEXT NOT NULL DEFAULT 'pending'
  CHECK (approval_status IN ('pending', 'approved', 'rejected'));

-- Approve all existing listings so they stay visible
UPDATE listings SET approval_status = 'approved';

-- Add is_admin flag to profiles
ALTER TABLE profiles
  ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT false;

-- Update listings SELECT policy to require approval for public browsing
DROP POLICY IF EXISTS "Authenticated users can view listings" ON listings;
CREATE POLICY "Authenticated users can view listings"
  ON listings FOR SELECT TO authenticated
  USING (
    (status = 'active' AND approval_status = 'approved')
    OR seller_id = auth.uid()
    OR sold_to_buyer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM conversations c WHERE c.listing_id = id AND c.buyer_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

-- Allow admins to update any listing (for approve/reject)
CREATE POLICY "Admins can update listings"
  ON listings FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));
