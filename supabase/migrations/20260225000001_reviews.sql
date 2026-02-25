CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(listing_id, reviewer_id)
);
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view reviews"
  ON reviews FOR SELECT TO authenticated USING (true);
CREATE POLICY "Buyers can review sold listings"
  ON reviews FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = reviewer_id AND
    EXISTS (
      SELECT 1 FROM conversations c
      JOIN listings l ON l.id = c.listing_id
      WHERE c.listing_id = reviews.listing_id
        AND c.buyer_id = auth.uid()
        AND l.status = 'sold'
        AND l.seller_id = reviews.seller_id
    )
  );
