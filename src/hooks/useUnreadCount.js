import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

const POLL_INTERVAL = 15000

export function useUnreadCount() {
  const { user } = useAuth()
  const location = useLocation()
  const [unreadCount, setUnreadCount] = useState(0)

  const compute = useCallback(async () => {
    if (!user) { setUnreadCount(0); return }
    const { data } = await supabase
      .from('conversations')
      .select('buyer_id, seller_id, last_message_at, last_message_sender_id, buyer_last_read_at, seller_last_read_at')
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    if (!data) return
    setUnreadCount(data.filter(c => isUnread(c, user.id)).length)
  }, [user])

  useEffect(() => {
    if (!user) { setUnreadCount(0); return }

    compute()

    // Poll every 15s — reliable across all pages regardless of realtime config
    const interval = setInterval(compute, POLL_INTERVAL)

    // Realtime as enhancement for instant updates when it fires
    const channel = supabase
      .channel(`unread-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, compute)
      .subscribe()

    return () => {
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [user, compute])

  // Also re-query on navigation (clears badge after opening a conversation)
  useEffect(() => {
    compute()
  }, [location.pathname, compute])

  return unreadCount
}

export function isUnread(conv, userId) {
  if (!conv.last_message_at) return false
  if (!conv.last_message_sender_id) return false
  if (conv.last_message_sender_id === userId) return false
  const lastRead = conv.buyer_id === userId ? conv.buyer_last_read_at : conv.seller_last_read_at
  if (!lastRead) return true
  return new Date(conv.last_message_at) > new Date(lastRead)
}
