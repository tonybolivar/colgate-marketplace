-- Fix 1: Make the trigger SECURITY DEFINER so it can update conversations
-- despite no UPDATE policy on the conversations table (RLS was blocking it,
-- causing last_message_at, last_message_content, last_message_sender_id to
-- never actually update in the DB).
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix 2: RPC so clients can safely mark a conversation as read.
-- SECURITY DEFINER bypasses RLS; the WHERE clause enforces that only
-- a participant can mark their own side as read.
CREATE OR REPLACE FUNCTION mark_conversation_read(p_conversation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE conversations SET
    buyer_last_read_at  = CASE WHEN buyer_id  = auth.uid() THEN now() ELSE buyer_last_read_at  END,
    seller_last_read_at = CASE WHEN seller_id = auth.uid() THEN now() ELSE seller_last_read_at END
  WHERE id = p_conversation_id
    AND (buyer_id = auth.uid() OR seller_id = auth.uid());
END;
$$;
GRANT EXECUTE ON FUNCTION mark_conversation_read TO authenticated;

-- Backfill: re-stamp last_message_sender_id for all existing conversations
-- now that the trigger will work going forward.
UPDATE conversations c SET
  last_message_sender_id = (
    SELECT sender_id FROM messages
    WHERE conversation_id = c.id
    ORDER BY created_at DESC
    LIMIT 1
  );
