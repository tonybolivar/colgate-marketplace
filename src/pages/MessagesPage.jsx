import { useEffect, useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

const PAGE_SIZE = 20

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
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  const sentinelRef = useRef(null)
  const offsetRef = useRef(0)
  const isFetchingRef = useRef(false)

  useEffect(() => {
    if (user === null) navigate('/login', { replace: true })
  }, [user, navigate])

  useEffect(() => {
    if (!user) return
    fetchPage(0)
  }, [user])

  // Infinite scroll observer
  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasMore || loading) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isFetchingRef.current) {
          loadMore()
        }
      },
      { rootMargin: '400px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, loading])

  async function loadMore() {
    if (isFetchingRef.current || !hasMore) return
    isFetchingRef.current = true
    setLoadingMore(true)
    await fetchPage(offsetRef.current)
    setLoadingMore(false)
    isFetchingRef.current = false
  }

  async function fetchPage(offset) {
    if (offset === 0) setLoading(true)

    const { data, error } = await supabase
      .from('conversations')
      .select(`id, created_at, last_message_at, last_message_content, listing_id, buyer_id, seller_id,
               listings(id, title, price, images, status)`)
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .range(offset, offset + PAGE_SIZE - 1)

    if (!error && data) {
      const allIds = [...new Set(data.flatMap(c => [c.buyer_id, c.seller_id]))]
      let profileMap = {}
      if (allIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles').select('id, display_name, full_name').in('id', allIds)
        profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]))
      }

      const enriched = data.map(c => ({
        ...c,
        buyer: profileMap[c.buyer_id] || null,
        seller: profileMap[c.seller_id] || null,
      }))

      offsetRef.current = offset + data.length
      setHasMore(data.length === PAGE_SIZE)
      if (offset === 0) setConversations(enriched)
      else setConversations(prev => [...prev, ...enriched])
    }

    if (offset === 0) setLoading(false)
  }

  if (!user) return null

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-maroon mb-6">Messages</h1>

      {loading ? (
        <p className="text-shadow-gray dark:text-gray-400">Loading…</p>
      ) : conversations.length === 0 ? (
        <p className="text-shadow-gray dark:text-gray-400">No conversations yet. Browse listings and message a seller to get started.</p>
      ) : (
        <div className="space-y-2">
          {conversations.map(conv => {
            const isBuyer = conv.buyer_id === user.id
            const otherName = isBuyer
              ? conv.seller?.display_name || conv.seller?.full_name || 'Unknown'
              : conv.buyer?.display_name || conv.buyer?.full_name || 'Unknown'
            const listing = conv.listings

            return (
              <Link
                key={conv.id}
                to={`/messages/${conv.id}`}
                className="block border border-winter-gray dark:border-gray-700 rounded-xl p-4 hover:border-maroon hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">{otherName}</p>
                    {conv.last_message_content && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate mt-0.5">{conv.last_message_content}</p>
                    )}
                  </div>
                  {conv.last_message_at && (
                    <span className="text-xs text-shadow-gray dark:text-gray-400 whitespace-nowrap">{timeAgo(conv.last_message_at)}</span>
                  )}
                </div>
                {listing?.title && (
                  <div className="flex items-center gap-3 border border-gray-200 dark:border-gray-700 rounded-lg p-2 bg-gray-50 dark:bg-gray-800">
                    <div className="w-10 h-10 rounded-md bg-gray-200 dark:bg-gray-700 overflow-hidden flex-shrink-0">
                      {listing.images && listing.images.length > 0 ? (
                        <img src={listing.images[0]} alt={listing.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500 text-xs">—</div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{listing.title}</p>
                      <p className="text-xs text-maroon font-semibold">
                        {listing.price != null ? `$${parseFloat(listing.price).toFixed(2)}` : 'Negotiable'}
                      </p>
                    </div>
                    {listing.status === 'sold' && (
                      <span className="ml-auto text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium flex-shrink-0">Sold</span>
                    )}
                  </div>
                )}
              </Link>
            )
          })}
        </div>
      )}

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-1" />
      {loadingMore && (
        <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-6">Loading more…</p>
      )}
    </div>
  )
}
