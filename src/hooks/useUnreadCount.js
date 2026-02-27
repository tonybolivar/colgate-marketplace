import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

const POLL_INTERVAL = 15000

export function useUnreadCount() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
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

    // Realtime: update badge + fire toast for incoming messages
    const channel = supabase
      .channel(`unread-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async payload => {
        compute()

        const msg = payload.new
        // Don't notify for own messages or if already in that conversation
        if (msg.sender_id === user.id) return
        if (window.location.pathname === `/messages/${msg.conversation_id}`) return

        // Fetch sender name for the toast
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, full_name')
          .eq('id', msg.sender_id)
          .single()
        const name = profile?.display_name || profile?.full_name || 'Someone'
        const body = msg.content.length > 80 ? msg.content.slice(0, 80) + '…' : msg.content

        toast(`New message from ${name}`, {
          description: body,
          action: {
            label: 'View',
            onClick: () => navigate(`/messages/${msg.conversation_id}`),
          },
          duration: 6000,
        })
      })
      .subscribe()

    return () => {
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [user, compute, navigate])

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
