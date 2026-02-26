-- Add denormalized last-message fields to conversations for efficient inbox sorting
ALTER TABLE conversations
  ADD COLUMN last_message_at TIMESTAMPTZ,
  ADD COLUMN last_message_content TEXT;

-- Backfill from existing messages
UPDATE conversations c SET
  last_message_at    = (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1),
  last_message_content = (SELECT content   FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1);

-- Fall back to conversation created_at when no messages exist
UPDATE conversations SET last_message_at = created_at WHERE last_message_at IS NULL;

-- Keep these fields up-to-date on every new message
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET last_message_at = NEW.created_at, last_message_content = NEW.content
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_message_insert_update_conversation
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_last_message();
