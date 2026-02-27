import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export function useUnreadCount() {
  const { user } = useAuth()
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

    // Recompute whenever a message is inserted
    const channel = supabase
      .channel('unread-count')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversations' }, compute)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user])

  return unreadCount
}

export function isUnread(conv, userId) {
  if (!conv.last_message_at) return false
  if (conv.last_message_sender_id === userId) return false
  const lastRead = conv.buyer_id === userId ? conv.buyer_last_read_at : conv.seller_last_read_at
  if (!lastRead) return true
  return new Date(conv.last_message_at) > new Date(lastRead)
}
