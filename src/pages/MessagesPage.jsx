import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export default function MessagesPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user === null) navigate('/login', { replace: true })
  }, [user, navigate])

  useEffect(() => {
    if (!user) return
    fetchConversations()
  }, [user])

  async function fetchConversations() {
    setLoading(true)
    const { data, error } = await supabase
      .from('conversations')
      .select(`id, created_at, listing_id, buyer_id, seller_id, listings(title), messages(content, created_at)`)
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .order('created_at', { ascending: false })

    if (!error && data) {
      const allIds = [...new Set(data.flatMap(c => [c.buyer_id, c.seller_id]))]
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', allIds)
      const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]))

      const enriched = data.map(c => ({
        ...c,
        buyer: profileMap[c.buyer_id] || null,
        seller: profileMap[c.seller_id] || null,
      }))

      const sorted = enriched.sort((a, b) => {
        const aLast = a.messages?.length
          ? Math.max(...a.messages.map(m => new Date(m.created_at).getTime()))
          : new Date(a.created_at).getTime()
        const bLast = b.messages?.length
          ? Math.max(...b.messages.map(m => new Date(m.created_at).getTime()))
          : new Date(b.created_at).getTime()
        return bLast - aLast
      })
      setConversations(sorted)
    }
    setLoading(false)
  }

  if (!user) return null

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-maroon mb-6">Messages</h1>

      {loading ? (
        <p className="text-shadow-gray">Loading…</p>
      ) : conversations.length === 0 ? (
        <p className="text-shadow-gray">No conversations yet. Browse listings and message a seller to get started.</p>
      ) : (
        <div className="space-y-2">
          {conversations.map(conv => {
            const isBuyer = conv.buyer_id === user.id
            const otherName = isBuyer
              ? conv.seller?.full_name || 'Unknown'
              : conv.buyer?.full_name || 'Unknown'
            const lastMsg = conv.messages?.length
              ? conv.messages.reduce((latest, m) =>
                  new Date(m.created_at) > new Date(latest.created_at) ? m : latest
                )
              : null

            return (
              <Link
                key={conv.id}
                to={`/messages/${conv.id}`}
                className="block border border-winter-gray rounded-xl p-4 hover:border-maroon hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-gray-900 truncate">{otherName}</p>
                    {conv.listings?.title && (
                      <p className="text-xs text-shadow-gray truncate">Re: {conv.listings.title}</p>
                    )}
                    {lastMsg && (
                      <p className="text-sm text-gray-600 truncate mt-1">{lastMsg.content}</p>
                    )}
                  </div>
                  {lastMsg && (
                    <span className="text-xs text-shadow-gray whitespace-nowrap">{timeAgo(lastMsg.created_at)}</span>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
