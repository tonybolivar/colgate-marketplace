import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { CATEGORIES, CONDITIONS } from '@/lib/categories'
import { Button } from '@/components/ui/button'

function StarDisplay({ rating, count }) {
  return (
    <span className="flex items-center gap-1">
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} viewBox="0 0 20 20" fill="currentColor"
          className={`w-4 h-4 ${i < Math.round(rating) ? 'text-yellow-400' : 'text-gray-300'}`}>
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className="text-sm font-medium text-gray-700">{rating}</span>
      <span className="text-sm text-gray-400">({count})</span>
    </span>
  )
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export default function ListingDetailPage() {
  const { user, isAdmin } = useAuth()
  const navigate = useNavigate()
  const { id } = useParams()

  const [listing, setListing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeImg, setActiveImg] = useState(0)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')

  const [confirmTakeDown, setConfirmTakeDown] = useState(false)
  const [listingRating, setListingRating] = useState(null) // { avg, count } for services

  useEffect(() => {
    if (user === null) navigate('/login', { replace: true })
  }, [user, navigate])

  useEffect(() => {
    if (!user) return
    fetchListing()
  }, [user, id])

  async function fetchListing() {
    setLoading(true)
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('id', id)
      .single()
    if (error || !data) {
      setLoading(false)
      return
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, account_type')
      .eq('id', data.seller_id)
      .single()
    setListing({ ...data, profiles: profile || null })

    if (data.category === 'services') {
      const { data: revs } = await supabase
        .from('reviews')
        .select('rating')
        .eq('listing_id', data.id)
      if (revs && revs.length > 0) {
        const avg = (revs.reduce((s, r) => s + r.rating, 0) / revs.length).toFixed(1)
        setListingRating({ avg, count: revs.length })
      }
    }

    setLoading(false)
  }

  async function handleTakeDown() {
    setActionLoading(true)
    setError('')
    const { error } = await supabase
      .from('listings')
      .update({ status: 'archived' })
      .eq('id', id)
    if (error) {
      setError(error.message)
      setActionLoading(false)
    } else {
      setListing(l => ({ ...l, status: 'archived' }))
      setConfirmTakeDown(false)
      setActionLoading(false)
    }
  }

  async function handleMessage() {
    setActionLoading(true)
    setError('')

    // Check if conversation already exists first (upsert triggers RLS USING check)
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('listing_id', id)
      .eq('buyer_id', user.id)
      .maybeSingle()

    if (existing) {
      navigate(`/messages/${existing.id}`)
      return
    }

    const { data, error } = await supabase
      .from('conversations')
      .insert({ listing_id: id, buyer_id: user.id, seller_id: listing.seller_id })
      .select('id')
      .single()

    if (error) {
      setError(error.message)
      setActionLoading(false)
      return
    }
    navigate(`/messages/${data.id}`)
  }

  if (!user) return null

  if (loading) {
    return <div className="max-w-4xl mx-auto px-4 py-12 text-shadow-gray">Loading…</div>
  }

  if (!listing) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <p className="text-shadow-gray">Listing not found.</p>
        <Link to="/browse" className="text-maroon text-sm underline mt-2 inline-block">Back to Browse</Link>
      </div>
    )
  }

  const isSeller = user.id === listing.seller_id
  const isAdminViewing = isAdmin && !isSeller
  const categoryLabel = CATEGORIES.find(c => c.value === listing.category)?.label || listing.category
  const conditionLabel = CONDITIONS.find(c => c.value === listing.condition)?.label

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <Link to="/browse" className="text-sm text-shadow-gray hover:text-maroon mb-6 inline-block">
        ← Back to Browse
      </Link>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Image gallery */}
        <div className="space-y-3">
          <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden">
            {listing.images && listing.images.length > 0 ? (
              <img
                src={listing.images[activeImg]}
                alt={listing.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                No photos
              </div>
            )}
          </div>
          {listing.images && listing.images.length > 1 && (
            <div className="flex gap-2">
              {listing.images.map((src, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(i)}
                  className={`w-16 h-16 rounded-md overflow-hidden border-2 transition-colors ${
                    i === activeImg ? 'border-maroon' : 'border-transparent'
                  }`}
                >
                  <img src={src} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-4">
          <div>
            <span className="text-sm text-shadow-gray capitalize">{categoryLabel}</span>
            {listing.status === 'sold' && (
              <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">Sold</span>
            )}
            {isSeller && listing.approval_status === 'pending' && (
              <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full font-medium">Pending Approval</span>
            )}
            {isSeller && listing.approval_status === 'rejected' && (
              <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">Rejected</span>
            )}
            {listing.category === 'services' && listing.times_sold > 0 && (
              <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                {listing.times_sold} sold
              </span>
            )}
            <h1 className="text-2xl font-bold text-gray-900 mt-1">{listing.title}</h1>
            <p className="text-2xl font-bold text-maroon mt-1">
              {listing.price != null ? `$${parseFloat(listing.price).toFixed(2)}` : 'Price negotiable'}
            </p>
            {listingRating && (
              <div className="mt-1">
                <StarDisplay rating={listingRating.avg} count={listingRating.count} />
              </div>
            )}
          </div>

          {/* Badges row */}
          <div className="flex flex-wrap gap-2 text-sm">
            {conditionLabel && (
              <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full">
                Condition: {conditionLabel}
              </span>
            )}
            {listing.category === 'textbooks' && listing.course_dept && (
              <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full">
                {listing.course_dept}{listing.course_number ? ` ${listing.course_number}` : ''}
              </span>
            )}
          </div>

          {listing.description && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Description</p>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{listing.description}</p>
            </div>
          )}

          {listing.pickup_location && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Pickup location</p>
              <p className="text-sm text-gray-600">{listing.pickup_location}</p>
            </div>
          )}

          <div className="border-t pt-4">
            <p className="text-sm font-medium text-gray-700 mb-1">Seller</p>
            <p className="text-sm text-gray-600">
              <Link to={`/profile/${listing.seller_id}`} className="underline hover:text-maroon">
                {listing.profiles?.full_name || 'Unknown'}
              </Link>
              {listing.profiles?.account_type && (
                <span className="ml-2 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full capitalize">
                  {listing.profiles.account_type}
                </span>
              )}
            </p>
            <p className="text-xs text-shadow-gray mt-1">Posted {timeAgo(listing.created_at)}</p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {isSeller ? (
            <div className="space-y-2">
              <Button
                onClick={() => navigate(`/listings/${id}/edit`)}
                variant="outline"
                className="w-full"
              >
                Edit Listing
              </Button>
              {listing.status === 'active' && (
                confirmTakeDown ? (
                  <div className="flex gap-2">
                    <Button
                      onClick={handleTakeDown}
                      disabled={actionLoading}
                      variant="destructive"
                      className="flex-1"
                    >
                      {actionLoading ? 'Removing…' : 'Yes, take down'}
                    </Button>
                    <Button
                      onClick={() => setConfirmTakeDown(false)}
                      disabled={actionLoading}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={() => setConfirmTakeDown(true)}
                    variant="outline"
                    className="w-full text-gray-600"
                  >
                    Take Down Listing
                  </Button>
                )
              )}
              {listing.status === 'archived' && (
                <p className="text-sm text-center text-shadow-gray">This listing has been taken down.</p>
              )}
            </div>
          ) : isAdminViewing ? (
            <div className="space-y-2">
              <p className="text-xs text-center text-amber-600 font-medium bg-amber-50 rounded-lg py-1">Admin controls</p>
              <Button
                onClick={() => navigate(`/listings/${id}/edit`)}
                variant="outline"
                className="w-full"
              >
                Edit Listing
              </Button>
              {listing.status === 'active' && (
                confirmTakeDown ? (
                  <div className="flex gap-2">
                    <Button
                      onClick={handleTakeDown}
                      disabled={actionLoading}
                      variant="destructive"
                      className="flex-1"
                    >
                      {actionLoading ? 'Closing…' : 'Yes, close listing'}
                    </Button>
                    <Button
                      onClick={() => setConfirmTakeDown(false)}
                      disabled={actionLoading}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={() => setConfirmTakeDown(true)}
                    variant="outline"
                    className="w-full text-gray-600"
                  >
                    Close Listing
                  </Button>
                )
              )}
              {listing.status === 'archived' && (
                <Button
                  onClick={async () => {
                    setActionLoading(true)
                    await supabase.from('listings').update({ status: 'active' }).eq('id', id)
                    setListing(l => ({ ...l, status: 'active' }))
                    setActionLoading(false)
                  }}
                  disabled={actionLoading}
                  variant="outline"
                  className="w-full text-green-700 border-green-300 hover:bg-green-50"
                >
                  Reopen Listing
                </Button>
              )}
            </div>
          ) : (
            listing.status === 'active' && (
              <Button
                onClick={handleMessage}
                disabled={actionLoading}
                className="w-full bg-maroon hover:bg-maroon-light text-white"
              >
                {actionLoading ? 'Opening chat…' : 'Message Seller'}
              </Button>
            )
          )}
        </div>
      </div>
    </div>
  )
}
