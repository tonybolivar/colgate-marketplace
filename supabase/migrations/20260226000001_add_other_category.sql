-- Drop the existing category check constraint and add 'other'
ALTER TABLE listings
  DROP CONSTRAINT IF EXISTS listings_category_check;

ALTER TABLE listings
  ADD CONSTRAINT listings_category_check
  CHECK (category IN (
    'textbooks','furniture','electronics','clothing',
    'school_supplies','event_tickets','rides','services','free','other'
  ));
