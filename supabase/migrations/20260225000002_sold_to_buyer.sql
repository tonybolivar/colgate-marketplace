ALTER TABLE listings
  ADD COLUMN sold_to_buyer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Also need buyers to be able to SELECT sold listings to see the review prompt
DROP POLICY IF EXISTS "Authenticated users can view active listings" ON listings;
CREATE POLICY "Authenticated users can view listings"
  ON listings FOR SELECT TO authenticated
  USING (
    status = 'active'
    OR seller_id = auth.uid()
    OR sold_to_buyer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.listing_id = id AND c.buyer_id = auth.uid()
    )
  );

-- Replace reviews INSERT policy to use sold_to_buyer_id
DROP POLICY IF EXISTS "Buyers can review sold listings" ON reviews;
CREATE POLICY "Buyers can review sold listings"
  ON reviews FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = reviewer_id AND
    EXISTS (
      SELECT 1 FROM listings l
      WHERE l.id = reviews.listing_id
        AND l.status = 'sold'
        AND l.seller_id = reviews.seller_id
        AND l.sold_to_buyer_id = auth.uid()
    )
  );
