import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { CATEGORIES, CONDITIONS } from '@/lib/categories'
import { Button } from '@/components/ui/button'
import { Share2, Bookmark, BookmarkCheck } from 'lucide-react'
import { toast } from 'sonner'

const RECENTLY_VIEWED_KEY = 'colgate_recently_viewed'

function StarDisplay({ rating, count }) {
  return (
    <span className="flex items-center gap-1">
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} viewBox="0 0 20 20" fill="currentColor"
          className={`w-4 h-4 ${i < Math.round(rating) ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}>
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{rating}</span>
      <span className="text-sm text-gray-400 dark:text-gray-500">({count})</span>
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

function saveRecentlyViewed(listing) {
  try {
    const entry = {
      id: listing.id,
      title: listing.title,
      price: listing.price,
      images: listing.images,
      category: listing.category,
      condition: listing.condition,
    }
    const existing = JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) || '[]')
    const filtered = existing.filter(e => e.id !== entry.id)
    const updated = [entry, ...filtered].slice(0, 10)
    localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(updated))
  } catch {
    // ignore storage errors
  }
}

const REPORT_REASONS = [
  'Prohibited item',
  'Spam or duplicate',
  'Misleading description',
  'Wrong category',
  'Other',
]

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
  const [listingRating, setListingRating] = useState(null)
  const [sellerResponseRate, setSellerResponseRate] = useState(null)

  // Save/bookmark state
  const [isSaved, setIsSaved] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)

  // Report state
  const [alreadyReported, setAlreadyReported] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [reportDetails, setReportDetails] = useState('')
  const [reportSubmitting, setReportSubmitting] = useState(false)
  const [reportDone, setReportDone] = useState(false)

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
      .select('display_name, full_name, account_type')
      .eq('id', data.seller_id)
      .single()
    setListing({ ...data, profiles: profile || null })

    // Recently viewed — skip archived/sold
    if (data.status === 'active') {
      saveRecentlyViewed(data)
    }

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

    // Seller response rate
    const { data: convs } = await supabase
      .from('conversations')
      .select('id')
      .eq('seller_id', data.seller_id)
    if (convs && convs.length >= 3) {
      const convIds = convs.map(c => c.id)
      const { data: sellerMsgs } = await supabase
        .from('messages')
        .select('conversation_id')
        .eq('sender_id', data.seller_id)
        .in('conversation_id', convIds)
      const respondedCount = new Set(sellerMsgs?.map(m => m.conversation_id) || []).size
      setSellerResponseRate({ rate: Math.round((respondedCount / convs.length) * 100), total: convs.length })
    }

    // Fetch save status (non-seller, logged-in users)
    if (user && user.id !== data.seller_id) {
      const { data: saved } = await supabase
        .from('saved_listings')
        .select('id')
        .eq('user_id', user.id)
        .eq('listing_id', data.id)
        .maybeSingle()
      setIsSaved(!!saved)

      // Check if already reported
      const { data: report } = await supabase
        .from('listing_reports')
        .select('id')
        .eq('reporter_id', user.id)
        .eq('listing_id', data.id)
        .maybeSingle()
      setAlreadyReported(!!report)
    }

    setLoading(false)
  }

  async function handleShare() {
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({ title: listing?.title, url })
      } catch {
        // user cancelled — no-op
      }
    } else {
      await navigator.clipboard.writeText(url)
      toast('Link copied!')
    }
  }

  async function handleToggleSave() {
    if (!user || saveLoading) return
    setSaveLoading(true)
    if (isSaved) {
      await supabase
        .from('saved_listings')
        .delete()
        .eq('user_id', user.id)
        .eq('listing_id', id)
      setIsSaved(false)
    } else {
      await supabase
        .from('saved_listings')
        .insert({ user_id: user.id, listing_id: id })
      setIsSaved(true)
    }
    setSaveLoading(false)
  }

  async function handleSubmitReport(e) {
    e.preventDefault()
    if (!reportReason) return
    setReportSubmitting(true)
    await supabase.from('listing_reports').insert({
      reporter_id: user.id,
      listing_id: id,
      reason: reportReason,
      details: reportDetails.trim() || null,
    })
    setReportSubmitting(false)
    setReportDone(true)
    setReportOpen(false)
    setAlreadyReported(true)
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
    return <div className="max-w-4xl mx-auto px-4 py-12 text-shadow-gray dark:text-gray-400">Loading…</div>
  }

  if (!listing) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <p className="text-shadow-gray dark:text-gray-400">Listing not found.</p>
        <Link to="/browse" className="text-maroon text-sm underline mt-2 inline-block">Back to Browse</Link>
      </div>
    )
  }

  const isSeller = user.id === listing.seller_id
  const isAdminViewing = isAdmin && !isSeller
  const isBuyer = !isSeller && !isAdmin
  const categoryLabel = CATEGORIES.find(c => c.value === listing.category)?.label || listing.category
  const conditionLabel = CONDITIONS.find(c => c.value === listing.condition)?.label

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <Link to="/browse" className="text-sm text-shadow-gray dark:text-gray-400 hover:text-maroon mb-6 inline-block">
        ← Back to Browse
      </Link>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Image gallery */}
        <div className="space-y-3">
          <div className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden">
            {listing.images && listing.images.length > 0 ? (
              <img
                src={listing.images[activeImg]}
                alt={listing.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
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
            <span className="text-sm text-shadow-gray dark:text-gray-400 capitalize">{categoryLabel}</span>
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
              <span className="ml-2 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full font-medium">
                {listing.times_sold} sold
              </span>
            )}
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{listing.title}</h1>
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
              <span className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-3 py-1 rounded-full">
                Condition: {conditionLabel}
              </span>
            )}
            {listing.category === 'textbooks' && listing.course_dept && (
              <span className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-3 py-1 rounded-full">
                {listing.course_dept}{listing.course_number ? ` ${listing.course_number}` : ''}
              </span>
            )}
          </div>

          {listing.description && (
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{listing.description}</p>
            </div>
          )}

          {listing.pickup_location && (
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pickup location</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{listing.pickup_location}</p>
            </div>
          )}

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Seller</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <Link to={`/profile/${listing.seller_id}`} className="underline hover:text-maroon">
                {listing.profiles?.display_name || listing.profiles?.full_name || 'Unknown'}
              </Link>
              {listing.profiles?.account_type && (
                <span className="ml-2 text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full capitalize">
                  {listing.profiles.account_type}
                </span>
              )}
            </p>
            <p className="text-xs text-shadow-gray dark:text-gray-400 mt-1">Posted {timeAgo(listing.created_at)}</p>
            {sellerResponseRate !== null && (
              <p className="text-xs text-shadow-gray dark:text-gray-400 mt-0.5">
                Responds to {sellerResponseRate.rate}% of messages
              </p>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {isSeller ? (
            <div className="space-y-2">
              {/* Share button — visible to everyone */}
              <Button onClick={handleShare} variant="outline" className="w-full flex items-center gap-2">
                <Share2 className="w-4 h-4" />
                Share
              </Button>
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
                    <Button onClick={handleTakeDown} disabled={actionLoading} variant="destructive" className="flex-1">
                      {actionLoading ? 'Removing…' : 'Yes, take down'}
                    </Button>
                    <Button onClick={() => setConfirmTakeDown(false)} disabled={actionLoading} variant="outline" className="flex-1">
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button onClick={() => setConfirmTakeDown(true)} variant="outline" className="w-full text-gray-600 dark:text-gray-400">
                    Take Down Listing
                  </Button>
                )
              )}
              {listing.status === 'archived' && (
                <p className="text-sm text-center text-shadow-gray dark:text-gray-400">This listing has been taken down.</p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {/* Share + Save row */}
              <div className="flex gap-2">
                <Button onClick={handleShare} variant="outline" className="flex-1 flex items-center gap-2">
                  <Share2 className="w-4 h-4" />
                  Share
                </Button>
                <Button
                  onClick={handleToggleSave}
                  variant="outline"
                  disabled={saveLoading}
                  className="flex-1 flex items-center gap-2"
                >
                  {isSaved
                    ? <><BookmarkCheck className="w-4 h-4 text-maroon" /> Saved</>
                    : <><Bookmark className="w-4 h-4" /> Save</>
                  }
                </Button>
              </div>

              {listing.status === 'active' && (
                <Button
                  onClick={handleMessage}
                  disabled={actionLoading}
                  className="w-full bg-maroon hover:bg-maroon-light text-white"
                >
                  {actionLoading ? 'Opening chat…' : 'Message Seller'}
                </Button>
              )}

              {isAdminViewing && (
                <div className="space-y-2 pt-1 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-center text-amber-600 font-medium bg-amber-50 dark:bg-amber-950/30 rounded-lg py-1">Admin controls</p>
                  <Button onClick={() => navigate(`/listings/${id}/edit`)} variant="outline" className="w-full">
                    Edit Listing
                  </Button>
                  {listing.status === 'active' && (
                    confirmTakeDown ? (
                      <div className="flex gap-2">
                        <Button onClick={handleTakeDown} disabled={actionLoading} variant="destructive" className="flex-1">
                          {actionLoading ? 'Closing…' : 'Yes, close listing'}
                        </Button>
                        <Button onClick={() => setConfirmTakeDown(false)} disabled={actionLoading} variant="outline" className="flex-1">
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button onClick={() => setConfirmTakeDown(true)} variant="outline" className="w-full text-gray-600 dark:text-gray-400">
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
              )}

              {/* Report listing (non-seller, non-admin, logged in) */}
              {isBuyer && (
                <div className="pt-2">
                  {reportDone || alreadyReported ? (
                    <p className="text-xs text-center text-gray-400 dark:text-gray-500">You've reported this listing</p>
                  ) : reportOpen ? (
                    <form onSubmit={handleSubmitReport} className="space-y-2 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Report this listing</p>
                      <select
                        value={reportReason}
                        onChange={e => setReportReason(e.target.value)}
                        required
                        className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
                      >
                        <option value="">Select a reason…</option>
                        {REPORT_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                      <textarea
                        value={reportDetails}
                        onChange={e => setReportDetails(e.target.value)}
                        rows={2}
                        maxLength={500}
                        placeholder="Additional details (optional)"
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon resize-none bg-white dark:bg-gray-900 dark:text-gray-100"
                      />
                      <div className="flex gap-2">
                        <Button type="submit" disabled={reportSubmitting || !reportReason} className="bg-maroon hover:bg-maroon-light text-white text-xs h-8 px-3">
                          {reportSubmitting ? 'Submitting…' : 'Submit'}
                        </Button>
                        <Button type="button" variant="outline" onClick={() => setReportOpen(false)} className="text-xs h-8 px-3">
                          Cancel
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <button
                      onClick={() => setReportOpen(true)}
                      className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 underline w-full text-center"
                    >
                      Report listing
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
