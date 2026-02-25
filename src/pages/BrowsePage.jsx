import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { CATEGORIES } from '@/lib/categories'
import { Input } from '@/components/ui/input'

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
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const activeCategory = searchParams.get('category') || 'all'

  useEffect(() => {
    if (user === null) navigate('/login', { replace: true })
  }, [user, navigate])

  useEffect(() => {
    setSearch(searchParams.get('search') || '')
  }, [searchParams.get('search')])

  useEffect(() => {
    if (!user) return
    fetchListings()
  }, [user, activeCategory, search])

  async function fetchListings() {
    setLoading(true)
    let query = supabase
      .from('listings')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (activeCategory !== 'all') {
      query = query.eq('category', activeCategory)
    }
    if (search.trim()) {
      query = query.ilike('title', `%${search.trim()}%`)
    }

    const { data, error } = await query
    if (!error && data) {
      const sellerIds = [...new Set(data.map(l => l.seller_id))]
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', sellerIds)
      const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]))

      // Fetch ratings for service listings
      const serviceIds = data.filter(l => l.category === 'services').map(l => l.id)
      let ratingMap = {}
      if (serviceIds.length > 0) {
        const { data: revs } = await supabase
          .from('reviews')
          .select('listing_id, rating')
          .in('listing_id', serviceIds)
        if (revs) {
          for (const r of revs) {
            if (!ratingMap[r.listing_id]) ratingMap[r.listing_id] = []
            ratingMap[r.listing_id].push(r.rating)
          }
        }
      }

      setListings(data.map(l => {
        const ratings = ratingMap[l.id]
        const avgRating = ratings
          ? (ratings.reduce((s, r) => s + r, 0) / ratings.length).toFixed(1)
          : null
        return { ...l, profiles: profileMap[l.seller_id] || null, avgRating, reviewCount: ratings?.length ?? 0 }
      }))
    }
    setLoading(false)
  }

  function setCategory(cat) {
    if (cat === 'all') {
      setSearchParams({})
    } else {
      setSearchParams({ category: cat })
    }
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
              : 'bg-winter-gray text-gray-700 hover:bg-gray-200'
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
                : 'bg-winter-gray text-gray-700 hover:bg-gray-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Listings grid */}
      {loading ? (
        <p className="text-shadow-gray">Loading…</p>
      ) : listings.length === 0 ? (
        <p className="text-shadow-gray">No listings found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {listings.map(listing => (
            <Link
              key={listing.id}
              to={`/listings/${listing.id}`}
              className="group border border-winter-gray rounded-xl overflow-hidden hover:border-maroon hover:shadow-md transition-all"
            >
              {/* Thumbnail */}
              <div className="aspect-square bg-gray-100 overflow-hidden">
                {listing.images && listing.images.length > 0 ? (
                  <img
                    src={listing.images[0]}
                    alt={listing.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                    No photo
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-3 space-y-1">
                <p className="font-semibold text-sm text-gray-900 truncate group-hover:text-maroon transition-colors">
                  {listing.title}
                </p>
                <p className="text-maroon font-bold text-sm">
                  {listing.price != null ? `$${parseFloat(listing.price).toFixed(2)}` : 'Price negotiable'}
                </p>
                {listing.category === 'services' && listing.avgRating && (
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }, (_, i) => (
                      <svg key={i} viewBox="0 0 20 20" fill="currentColor"
                        className={`w-3 h-3 ${i < Math.round(parseFloat(listing.avgRating)) ? 'text-yellow-400' : 'text-gray-300'}`}>
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                    <span className="text-xs text-gray-600 font-medium">{listing.avgRating}</span>
                    <span className="text-xs text-gray-400">({listing.reviewCount})</span>
                  </div>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  {listing.condition && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${conditionColors[listing.condition] || 'bg-gray-100 text-gray-700'}`}>
                      {listing.condition.replace('_', ' ')}
                    </span>
                  )}
                  <span className="text-xs text-shadow-gray capitalize">
                    {CATEGORIES.find(c => c.value === listing.category)?.label || listing.category}
                  </span>
                </div>
                <p className="text-xs text-shadow-gray">
                  {listing.profiles?.full_name || 'Unknown'} · {timeAgo(listing.created_at)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
