-- Add sender tracking and per-participant read tracking to conversations
ALTER TABLE conversations
  ADD COLUMN last_message_sender_id uuid references auth.users,
  ADD COLUMN buyer_last_read_at timestamptz,
  ADD COLUMN seller_last_read_at timestamptz;

-- Backfill last_message_sender_id from existing messages
UPDATE conversations c SET
  last_message_sender_id = (
    SELECT sender_id FROM messages
    WHERE conversation_id = c.id
    ORDER BY created_at DESC
    LIMIT 1
  );

-- Update trigger to also track sender
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET
    last_message_at = NEW.created_at,
    last_message_content = NEW.content,
    last_message_sender_id = NEW.sender_id
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
