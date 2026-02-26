import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { CATEGORIES } from '@/lib/categories'
import { Input } from '@/components/ui/input'

const PAGE_SIZE = 16

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

const conditionColors = {
  new: 'bg-green-100 text-green-800',
  like_new: 'bg-blue-100 text-blue-800',
  good: 'bg-yellow-100 text-yellow-800',
  fair: 'bg-orange-100 text-orange-800',
  poor: 'bg-red-100 text-red-800',
}

export default function BrowsePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const activeCategory = searchParams.get('category') || 'all'

  const sentinelRef = useRef(null)
  const offsetRef = useRef(0)
  const isFetchingRef = useRef(false)

  useEffect(() => {
    if (user === null) navigate('/login', { replace: true })
  }, [user, navigate])

  useEffect(() => {
    setSearch(searchParams.get('search') || '')
  }, [searchParams.get('search')])

  // Reset and reload when filters change
  useEffect(() => {
    if (!user) return
    offsetRef.current = 0
    isFetchingRef.current = false
    setHasMore(true)
    setListings([])
    fetchPage(0)
  }, [user, activeCategory, search])

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

    let query = supabase
      .from('listings')
      .select('*')
      .eq('status', 'active')
      .eq('approval_status', 'approved')
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1)

    if (activeCategory !== 'all') query = query.eq('category', activeCategory)
    if (search.trim()) query = query.ilike('title', `%${search.trim()}%`)

    const { data, error } = await query

    if (!error && data) {
      const sellerIds = [...new Set(data.map(l => l.seller_id))]
      let profileMap = {}
      if (sellerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles').select('id, full_name').in('id', sellerIds)
        profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]))
      }

      const serviceIds = data.filter(l => l.category === 'services').map(l => l.id)
      let ratingMap = {}
      if (serviceIds.length > 0) {
        const { data: revs } = await supabase
          .from('reviews').select('listing_id, rating').in('listing_id', serviceIds)
        if (revs) {
          for (const r of revs) {
            if (!ratingMap[r.listing_id]) ratingMap[r.listing_id] = []
            ratingMap[r.listing_id].push(r.rating)
          }
        }
      }

      const enriched = data.map(l => {
        const ratings = ratingMap[l.id]
        const avgRating = ratings
          ? (ratings.reduce((s, r) => s + r, 0) / ratings.length).toFixed(1)
          : null
        return { ...l, profiles: profileMap[l.seller_id] || null, avgRating, reviewCount: ratings?.length ?? 0 }
      })

      offsetRef.current = offset + data.length
      setHasMore(data.length === PAGE_SIZE)
      if (offset === 0) setListings(enriched)
      else setListings(prev => [...prev, ...enriched])
    }

    if (offset === 0) setLoading(false)
  }

  function setCategory(cat) {
    if (cat === 'all') setSearchParams({})
    else setSearchParams({ category: cat })
  }

  if (!user) return null

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-maroon mb-6">Browse Listings</h1>

      {/* Search */}
      <div className="mb-6">
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search listings…"
          className="max-w-sm"
        />
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap gap-2 mb-8">
        <button
          onClick={() => setCategory('all')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            activeCategory === 'all'
              ? 'bg-maroon text-white'
              : 'bg-winter-gray dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          All
        </button>
        {CATEGORIES.map(cat => (
          <button
            key={cat.value}
            onClick={() => setCategory(cat.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeCategory === cat.value
                ? 'bg-maroon text-white'
                : 'bg-winter-gray dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Listings grid */}
      {loading ? (
        <p className="text-shadow-gray dark:text-gray-400">Loading…</p>
      ) : listings.length === 0 ? (
        <p className="text-shadow-gray dark:text-gray-400">No listings found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {listings.map(listing => (
            <Link
              key={listing.id}
              to={`/listings/${listing.id}`}
              className="group border border-winter-gray dark:border-gray-700 rounded-xl overflow-hidden hover:border-maroon hover:shadow-md transition-all"
            >
              <div className="aspect-square bg-gray-100 dark:bg-gray-800 overflow-hidden">
                {listing.images && listing.images.length > 0 ? (
                  <img
                    src={listing.images[0]}
                    alt={listing.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
                    No photo
                  </div>
                )}
              </div>

              <div className="p-3 space-y-1">
                <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate group-hover:text-maroon transition-colors">
                  {listing.title}
                </p>
                <p className="text-maroon font-bold text-sm">
                  {listing.price != null ? `$${parseFloat(listing.price).toFixed(2)}` : 'Price negotiable'}
                </p>
                {listing.category === 'services' && listing.avgRating && (
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }, (_, i) => (
                      <svg key={i} viewBox="0 0 20 20" fill="currentColor"
                        className={`w-3 h-3 ${i < Math.round(parseFloat(listing.avgRating)) ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}>
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                    <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">{listing.avgRating}</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">({listing.reviewCount})</span>
                  </div>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  {listing.condition && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${conditionColors[listing.condition] || 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>
                      {listing.condition.replace('_', ' ')}
                    </span>
                  )}
                  <span className="text-xs text-shadow-gray dark:text-gray-400 capitalize">
                    {CATEGORIES.find(c => c.value === listing.category)?.label || listing.category}
                  </span>
                </div>
                <p className="text-xs text-shadow-gray dark:text-gray-400">
                  {listing.profiles?.full_name || 'Unknown'} · {timeAgo(listing.created_at)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-1" />
      {loadingMore && (
        <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-6">Loading more…</p>
      )}
      {!hasMore && listings.length > 0 && !loading && (
        <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-6">You've seen all listings</p>
      )}
    </div>
  )
}
