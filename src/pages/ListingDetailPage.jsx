import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { CATEGORIES, CONDITIONS } from '@/lib/categories'
import { Button } from '@/components/ui/button'

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
  const { user } = useAuth()
  const navigate = useNavigate()
  const { id } = useParams()

  const [listing, setListing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeImg, setActiveImg] = useState(0)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')

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
      .select('*, profiles(full_name, account_type)')
      .eq('id', id)
      .single()
    if (error || !data) {
      setLoading(false)
      return
    }
    setListing(data)
    setLoading(false)
  }

  async function handleMarkSold() {
    setActionLoading(true)
    const { error } = await supabase
      .from('listings')
      .update({ status: 'sold' })
      .eq('id', id)
    if (error) {
      setError(error.message)
    } else {
      setListing(l => ({ ...l, status: 'sold' }))
    }
    setActionLoading(false)
  }

  async function handleMessage() {
    setActionLoading(true)
    setError('')
    // Upsert conversation
    const { data, error } = await supabase
      .from('conversations')
      .upsert(
        { listing_id: id, buyer_id: user.id, seller_id: listing.seller_id },
        { onConflict: 'listing_id,buyer_id' }
      )
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
            <h1 className="text-2xl font-bold text-gray-900 mt-1">{listing.title}</h1>
            <p className="text-2xl font-bold text-maroon mt-1">
              {listing.price != null ? `$${parseFloat(listing.price).toFixed(2)}` : 'Price negotiable'}
            </p>
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
              {listing.profiles?.full_name || 'Unknown'}
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
            listing.status === 'active' && (
              <Button
                onClick={handleMarkSold}
                disabled={actionLoading}
                variant="outline"
                className="w-full"
              >
                {actionLoading ? 'Updating…' : 'Mark as Sold'}
              </Button>
            )
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
