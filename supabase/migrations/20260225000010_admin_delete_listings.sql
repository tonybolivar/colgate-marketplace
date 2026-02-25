-- Allow admins to delete any listing
CREATE POLICY "Admins can delete listings"
  ON listings FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));
