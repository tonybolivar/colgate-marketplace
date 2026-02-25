-- Allow reviews when sale was confirmed via in-chat flow (covers services + physical items)
DROP POLICY IF EXISTS "Buyers can review sold listings" ON reviews;

CREATE POLICY "Buyers can review after sale confirmation"
  ON reviews FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = reviewer_id AND
    (
      -- Physical items: listing marked sold with this buyer
      EXISTS (
        SELECT 1 FROM listings l
        WHERE l.id = reviews.listing_id
          AND l.status = 'sold'
          AND l.seller_id = reviews.seller_id
          AND l.sold_to_buyer_id = auth.uid()
      )
      OR
      -- Services (or any listing): in-chat sale_confirmed message exists in buyer's conversation
      EXISTS (
        SELECT 1 FROM conversations c
        JOIN messages m ON m.conversation_id = c.id
        WHERE c.listing_id = reviews.listing_id
          AND c.buyer_id = auth.uid()
          AND m.type = 'sale_confirmed'
      )
    )
  );
