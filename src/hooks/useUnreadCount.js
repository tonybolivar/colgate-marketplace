import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export function useUnreadCount() {
  const { user } = useAuth()
  const location = useLocation()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!user) { setUnreadCount(0); return }

    async function compute() {
      const { data } = await supabase
        .from('conversations')
        .select('buyer_id, seller_id, last_message_at, last_message_sender_id, buyer_last_read_at, seller_last_read_at')
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)

      if (!data) return
      const count = data.filter(c => isUnread(c, user.id)).length
      setUnreadCount(count)
    }

    compute()

    // Re-compute on new messages (messages Realtime is already enabled)
    const channel = supabase
      .channel(`unread-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, compute)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user, location.pathname]) // Re-query on every navigation (clears badge after opening a conversation)

  return unreadCount
}

export function isUnread(conv, userId) {
  if (!conv.last_message_at) return false
  // If sender tracking not available yet (migration not run), can't determine — treat as read
  if (!conv.last_message_sender_id) return false
  // Last message was sent by me — not unread
  if (conv.last_message_sender_id === userId) return false
  const lastRead = conv.buyer_id === userId ? conv.buyer_last_read_at : conv.seller_last_read_at
  // Never opened this conversation
  if (!lastRead) return true
  return new Date(conv.last_message_at) > new Date(lastRead)
}
