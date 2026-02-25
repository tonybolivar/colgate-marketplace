import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { CATEGORIES } from '@/lib/categories'
import { Button } from '@/components/ui/button'

function StarRating({ rating, max = 5, size = 'md', interactive = false, onChange }) {
  const sizeCls = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }, (_, i) => {
        const filled = i < rating
        return interactive ? (
          <button
            key={i}
            type="button"
            onClick={() => onChange && onChange(i + 1)}
            className={`${sizeCls} transition-colors ${filled ? 'text-yellow-400' : 'text-gray-300'} hover:text-yellow-400`}
            aria-label={`Rate ${i + 1} star${i !== 0 ? 's' : ''}`}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-full h-full">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        ) : (
          <span key={i} className={`${sizeCls} ${filled ? 'text-yellow-400' : 'text-gray-300'}`}>
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-full h-full">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </span>
        )
      })}
    </div>
  )
}

function ListingCard({ listing }) {
  const categoryLabel = CATEGORIES.find(c => c.value === listing.category)?.label || listing.category
  const sold = listing.status === 'sold'
  return (
    <Link
      to={`/listings/${listing.id}`}
      className={`block rounded-xl border bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow ${sold ? 'opacity-60' : ''}`}
    >
      <div className="aspect-square bg-gray-100 relative">
        {listing.images && listing.images.length > 0 ? (
          <img src={listing.images[0]} alt={listing.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">No photo</div>
        )}
        {sold && (
          <span className="absolute top-2 left-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">Sold</span>
        )}
      </div>
      <div className="p-3">
        <p className="text-xs text-shadow-gray capitalize mb-0.5">{categoryLabel}</p>
        <p className="font-medium text-gray-900 text-sm line-clamp-2">{listing.title}</p>
        <p className="text-maroon font-bold text-sm mt-1">
          {listing.price != null ? `$${parseFloat(listing.price).toFixed(2)}` : 'Negotiable'}
        </p>
      </div>
    </Link>
  )
}

function Section({ title, children }) {
  return (
    <section className="mb-10">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">{title}</h2>
      {children}
    </section>
  )
}

export default function ProfilePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { userId } = useParams()

  const [profile, setProfile] = useState(null)
  const [activeListings, setActiveListings] = useState([])
  const [soldListings, setSoldListings] = useState([])
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)

  // Review form state
  const [eligibleListings, setEligibleListings] = useState([])
  const [selectedListing, setSelectedListing] = useState('')
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [reviewError, setReviewError] = useState('')
  const [reviewSuccess, setReviewSuccess] = useState(false)

  useEffect(() => {
    if (user === null) navigate('/login', { replace: true })
  }, [user, navigate])

  useEffect(() => {
    if (!user || !userId) return
    fetchAll()
  }, [user, userId])

  async function fetchAll() {
    setLoading(true)

    const [profileRes, activeRes, soldRes, reviewsRes] = await Promise.all([
      supabase.from('profiles').select('full_name, account_type, created_at').eq('id', userId).single(),
      supabase.from('listings').select('*').eq('seller_id', userId).eq('status', 'active').order('created_at', { ascending: false }),
      supabase.from('listings').select('*').eq('seller_id', userId).eq('status', 'sold').order('created_at', { ascending: false }),
      supabase.from('reviews').select('*').eq('seller_id', userId).order('created_at', { ascending: false }),
    ])

    setProfile(profileRes.data || null)
    setActiveListings(activeRes.data || [])
    setSoldListings(soldRes.data || [])

    // Fetch reviewer names for reviews
    const rawReviews = reviewsRes.data || []
    if (rawReviews.length > 0) {
      const reviewerIds = [...new Set(rawReviews.map(r => r.reviewer_id))]
      const { data: reviewerProfiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', reviewerIds)
      const nameMap = Object.fromEntries((reviewerProfiles || []).map(p => [p.id, p.full_name]))

      // Fetch listing titles for reviews
      const listingIds = [...new Set(rawReviews.map(r => r.listing_id))]
      const { data: reviewListings } = await supabase
        .from('listings')
        .select('id, title')
        .in('id', listingIds)
      const titleMap = Object.fromEntries((reviewListings || []).map(l => [l.id, l.title]))

      setReviews(rawReviews.map(r => ({
        ...r,
        reviewer_name: nameMap[r.reviewer_id] || 'Unknown',
        listing_title: titleMap[r.listing_id] || 'Unknown listing',
      })))
    } else {
      setReviews([])
    }

    // Find eligible listings to review (only when viewing someone else's profile)
    if (user.id !== userId) {
      const { data: convs } = await supabase
        .from('conversations')
        .select('listing_id')
        .eq('buyer_id', user.id)
        .eq('seller_id', userId)

      if (convs && convs.length > 0) {
        const convListingIds = convs.map(c => c.listing_id).filter(Boolean)
        if (convListingIds.length > 0) {
          const { data: soldConvListings } = await supabase
            .from('listings')
            .select('id, title')
            .in('id', convListingIds)
            .eq('status', 'sold')

          const { data: alreadyReviewed } = await supabase
            .from('reviews')
            .select('listing_id')
            .eq('reviewer_id', user.id)
            .eq('seller_id', userId)

          const reviewedIds = new Set((alreadyReviewed || []).map(r => r.listing_id))
          const eligible = (soldConvListings || []).filter(l => !reviewedIds.has(l.id))
          setEligibleListings(eligible)
          if (eligible.length > 0) setSelectedListing(eligible[0].id)
        }
      }
    }

    setLoading(false)
  }

  async function handleSubmitReview(e) {
    e.preventDefault()
    if (!rating) { setReviewError('Please select a star rating.'); return }
    if (!selectedListing) { setReviewError('Please select a listing.'); return }

    setSubmitting(true)
    setReviewError('')

    const { error } = await supabase.from('reviews').insert({
      reviewer_id: user.id,
      seller_id: userId,
      listing_id: selectedListing,
      rating,
      comment: comment.trim() || null,
    })

    if (error) {
      setReviewError(error.message)
      setSubmitting(false)
      return
    }

    setReviewSuccess(true)
    setSubmitting(false)
    // Refresh all data so the new review appears
    await fetchAll()
    setRating(0)
    setComment('')
    setReviewSuccess(false)
  }

  if (!user) return null
  if (loading) return <div className="max-w-4xl mx-auto px-4 py-12 text-shadow-gray">Loading…</div>
  if (!profile) return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <p className="text-gray-600">Profile not found.</p>
      <Link to="/browse" className="text-maroon text-sm underline mt-2 inline-block">Back to Browse</Link>
    </div>
  )

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null

  const initial = profile.full_name ? profile.full_name.charAt(0).toUpperCase() : '?'
  const memberSince = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <Link to="/browse" className="text-sm text-shadow-gray hover:text-maroon mb-6 inline-block">← Back to Browse</Link>

      {/* Profile header */}
      <div className="flex items-center gap-5 mb-10">
        <div className="w-16 h-16 rounded-full bg-maroon text-white flex items-center justify-center text-2xl font-bold flex-shrink-0">
          {initial}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{profile.full_name || 'Unknown'}</h1>
          <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-600">
            {profile.account_type && (
              <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize text-xs">
                {profile.account_type}
              </span>
            )}
            {memberSince && <span>Member since {memberSince}</span>}
            {avgRating ? (
              <span className="flex items-center gap-1">
                <StarRating rating={Math.round(parseFloat(avgRating))} size="sm" />
                <span className="font-medium">{avgRating}</span>
                <span className="text-gray-400">({reviews.length} review{reviews.length !== 1 ? 's' : ''})</span>
              </span>
            ) : (
              <span className="text-gray-400 text-xs">No reviews yet</span>
            )}
          </div>
        </div>
      </div>

      {/* Active listings */}
      <Section title={`Active Listings (${activeListings.length})`}>
        {activeListings.length === 0 ? (
          <p className="text-sm text-gray-500">No active listings.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {activeListings.map(l => <ListingCard key={l.id} listing={l} />)}
          </div>
        )}
      </Section>

      {/* Sold listings */}
      <Section title={`Sold Listings (${soldListings.length})`}>
        {soldListings.length === 0 ? (
          <p className="text-sm text-gray-500">No sold listings.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {soldListings.map(l => <ListingCard key={l.id} listing={l} />)}
          </div>
        )}
      </Section>

      {/* Reviews */}
      <Section title={`Reviews (${reviews.length})`}>
        {reviews.length === 0 ? (
          <p className="text-sm text-gray-500">No reviews yet.</p>
        ) : (
          <div className="space-y-4">
            {reviews.map(r => (
              <div key={r.id} className="border rounded-xl p-4 bg-white shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <StarRating rating={r.rating} size="sm" />
                    {r.comment && <p className="text-sm text-gray-700 mt-2">{r.comment}</p>}
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  <span className="font-medium">{r.reviewer_name}</span>
                  {' · '}
                  <Link to={`/listings/${r.listing_id}`} className="underline hover:text-maroon">
                    {r.listing_title}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Leave a review */}
      {user.id !== userId && eligibleListings.length > 0 && (
        <Section title="Leave a Review">
          <form onSubmit={handleSubmitReview} className="border rounded-xl p-5 bg-white shadow-sm space-y-4 max-w-lg">
            {/* Listing selector */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Listing</label>
              <select
                value={selectedListing}
                onChange={e => setSelectedListing(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon"
              >
                {eligibleListings.map(l => (
                  <option key={l.id} value={l.id}>{l.title}</option>
                ))}
              </select>
            </div>

            {/* Star picker */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Rating</label>
              <StarRating rating={rating} interactive onChange={setRating} />
            </div>

            {/* Comment */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Comment <span className="font-normal text-gray-400">(optional)</span></label>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Share your experience…"
                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon resize-none"
              />
            </div>

            {reviewError && <p className="text-sm text-destructive">{reviewError}</p>}
            {reviewSuccess && <p className="text-sm text-green-600">Review submitted!</p>}

            <Button
              type="submit"
              disabled={submitting}
              className="bg-maroon hover:bg-maroon-light text-white"
            >
              {submitting ? 'Submitting…' : 'Submit Review'}
            </Button>
          </form>
        </Section>
      )}
    </div>
  )
}
