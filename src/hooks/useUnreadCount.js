import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

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

  // Stable subscription — lives for the entire user session, NOT torn down on navigation
  useEffect(() => {
    if (!user) return
    compute()
    const channel = supabase
      .channel(`unread-msgs-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, compute)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user, compute]) // compute only changes on login/logout

  // Re-query on navigation (clears badge after user opens a conversation)
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
