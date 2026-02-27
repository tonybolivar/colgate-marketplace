import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

function StarPicker({ rating, onChange }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i + 1)}
          className={`w-6 h-6 transition-colors ${i < rating ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'} hover:text-yellow-400`}
          aria-label={`Rate ${i + 1} star${i !== 0 ? 's' : ''}`}
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-full h-full">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </button>
      ))}
    </div>
  )
}

function Modal({ open, onClose, children }) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

const CONV_REPORT_REASONS = ['Harassment', 'Scam or fraud', 'Inappropriate content', 'Other']

function formatMsgTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  if (isToday) return timeStr
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' · ' + timeStr
}

export default function ConversationPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { conversationId } = useParams()

  const [conversation, setConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef(null)

  // Offer/confirm flow
  const [offerModalOpen, setOfferModalOpen] = useState(false)
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)
  const [processingAction, setProcessingAction] = useState(false)

  // Review state
  const [hasReviewed, setHasReviewed] = useState(false)
  const [reviewDone, setReviewDone] = useState(false)
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  const [reviewError, setReviewError] = useState('')

  // Report conversation state
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
    fetchConversation()
  }, [user, conversationId])

  useEffect(() => {
    if (!user || !conversationId) return

    const channel = supabase
      .channel(`conv-${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        payload => {
          setMessages(prev =>
            prev.some(m => m.id === payload.new.id) ? prev : [...prev, payload.new]
          )
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user, conversationId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function fetchConversation() {
    setLoading(true)
    const { data: conv, error: convErr } = await supabase
      .from('conversations')
      .select(`id, buyer_id, seller_id, listings(id, title, price, images, status, category, times_sold, sold_to_buyer_id, seller_id)`)
      .eq('id', conversationId)
      .single()

    if (convErr || !conv) {
      navigate('/messages', { replace: true })
      return
    }

    if (conv.buyer_id !== user.id && conv.seller_id !== user.id) {
      navigate('/messages', { replace: true })
      return
    }

    const otherId = conv.buyer_id === user.id ? conv.seller_id : conv.buyer_id
    const { data: otherProfile } = await supabase
      .from('profiles')
      .select('display_name, full_name')
      .eq('id', otherId)
      .single()

    setConversation({ ...conv, otherName: otherProfile?.display_name || otherProfile?.full_name || 'Unknown' })

    // If buyer, check if they already reviewed this listing
    const listing = conv.listings
    if (conv.buyer_id === user.id && listing) {
      const { data: existing } = await supabase
        .from('reviews')
        .select('id')
        .eq('listing_id', listing.id)
        .eq('reviewer_id', user.id)
        .maybeSingle()
      setHasReviewed(!!existing)
    }

    // Check if already reported this conversation
    const { data: existingReport } = await supabase
      .from('conversation_reports')
      .select('id')
      .eq('reporter_id', user.id)
      .eq('conversation_id', conversationId)
      .maybeSingle()
    setAlreadyReported(!!existingReport)

    const { data: msgs } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    setMessages(msgs || [])
    setLoading(false)
  }

  async function handleSend(e) {
    e.preventDefault()
    const content = text.trim()
    if (!content) return
    setText('') // clear immediately for snappy feel
    setSending(true)
    const { data, error } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content,
      type: 'text',
    }).select().single()
    if (error) {
      setText(content) // restore on failure
    } else if (data) {
      setMessages(prev => prev.some(m => m.id === data.id) ? prev : [...prev, data])
    }
    setSending(false)
  }

  async function handleConfirmOffer() {
    setProcessingAction(true)
    const { data } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: 'offered to confirm this purchase',
      type: 'sale_offer',
    }).select().single()
    if (data) setMessages(prev => prev.some(m => m.id === data.id) ? prev : [...prev, data])
    setOfferModalOpen(false)
    setProcessingAction(false)
  }

  async function handleConfirmSale() {
    if (!conversation) return
    setProcessingAction(true)
    const buyerId = conversation.buyer_id
    const listingId = conversation.listings?.id
    const isService = conversation.listings?.category === 'services'

    if (isService) {
      await supabase
        .from('listings')
        .update({ times_sold: (conversation.listings.times_sold ?? 0) + 1 })
        .eq('id', listingId)
      setConversation(prev => ({
        ...prev,
        listings: { ...prev.listings, times_sold: (prev.listings.times_sold ?? 0) + 1 },
      }))
    } else {
      await supabase
        .from('listings')
        .update({ status: 'sold', sold_to_buyer_id: buyerId })
        .eq('id', listingId)
      setConversation(prev => ({
        ...prev,
        listings: { ...prev.listings, status: 'sold', sold_to_buyer_id: buyerId },
      }))
    }

    const { data: confirmMsg } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: 'confirmed the sale',
      type: 'sale_confirmed',
    }).select().single()
    if (confirmMsg) setMessages(prev => prev.some(m => m.id === confirmMsg.id) ? prev : [...prev, confirmMsg])

    setConfirmModalOpen(false)
    setProcessingAction(false)
  }

  async function handleSubmitReport(e) {
    e.preventDefault()
    if (!reportReason) return
    setReportSubmitting(true)
    await supabase.from('conversation_reports').insert({
      reporter_id: user.id,
      conversation_id: conversationId,
      reason: reportReason,
      details: reportDetails.trim() || null,
    })
    setReportSubmitting(false)
    setReportDone(true)
    setReportOpen(false)
    setAlreadyReported(true)
  }

  async function handleSubmitReview(e) {
    e.preventDefault()
    if (!reviewRating) { setReviewError('Please select a rating.'); return }
    setReviewSubmitting(true)
    setReviewError('')

    const listing = conversation.listings
    const { error } = await supabase.from('reviews').insert({
      reviewer_id: user.id,
      seller_id: listing.seller_id,
      listing_id: listing.id,
      rating: reviewRating,
      comment: reviewComment.trim() || null,
    })

    if (error) {
      setReviewError(error.message)
      setReviewSubmitting(false)
      return
    }

    setReviewDone(true)
    setReviewSubmitting(false)
  }

  if (!user) return null

  if (loading) {
    return <div className="max-w-2xl mx-auto px-4 py-12 text-shadow-gray dark:text-gray-400">Loading…</div>
  }

  const listing = conversation.listings
  const isBuyer = conversation.buyer_id === user.id
  const isSeller = conversation.seller_id === user.id
  // Use most-recent special message to determine if an offer is pending (supports multi-round for services)
  const lastSpecialMsg = [...messages].reverse().find(m => m.type === 'sale_offer' || m.type === 'sale_confirmed')
  const hasPendingOffer = lastSpecialMsg?.type === 'sale_offer'
  const pendingOfferMsg = hasPendingOffer ? lastSpecialMsg : null
  const saleConfirmedMsg = messages.find(m => m.type === 'sale_confirmed')
  const saleComplete = !!saleConfirmedMsg || (listing?.status === 'sold' && listing?.sold_to_buyer_id === user.id)
  const canOffer = isBuyer && listing?.status === 'active' && !hasPendingOffer
  const showReviewPrompt = isBuyer && saleComplete && !hasReviewed && !reviewDone

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <Link to="/messages" className="text-sm text-shadow-gray dark:text-gray-400 hover:text-maroon">← Messages</Link>
            <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-1">{conversation.otherName}</h1>
            {listing?.title && (
              <Link
                to={`/listings/${listing.id}`}
                className="text-sm text-maroon hover:underline"
              >
                Re: {listing.title}
              </Link>
            )}
          </div>
          <div className="flex-shrink-0 pt-1">
            {reportDone || alreadyReported ? (
              <p className="text-xs text-gray-400 dark:text-gray-500">Reported</p>
            ) : (
              <button
                onClick={() => setReportOpen(o => !o)}
                className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 underline"
              >
                Report
              </button>
            )}
          </div>
        </div>

        {/* Report form */}
        {reportOpen && (
          <form onSubmit={handleSubmitReport} className="mt-3 border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2 bg-gray-50 dark:bg-gray-800/50">
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Report this conversation</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Admins will be able to read the messages in this conversation.</p>
            <select
              value={reportReason}
              onChange={e => setReportReason(e.target.value)}
              required
              className="w-full h-9 rounded-md border border-input bg-white dark:bg-gray-800 px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:text-gray-100 dark:border-gray-700"
            >
              <option value="">Select a reason…</option>
              {CONV_REPORT_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
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
        )}
      </div>

      {/* Listing card */}
      {listing?.title && (
        <Link
          to={`/listings/${listing.id}`}
          className="flex items-center gap-3 border border-gray-200 dark:border-gray-700 rounded-xl p-3 mb-4 bg-white dark:bg-gray-900 hover:shadow-md transition-shadow"
        >
          <div className="w-14 h-14 rounded-lg bg-gray-100 dark:bg-gray-800 overflow-hidden flex-shrink-0">
            {listing.images && listing.images.length > 0 ? (
              <img src={listing.images[0]} alt={listing.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500 text-xs">No photo</div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{listing.title}</p>
            <p className="text-sm text-maroon font-bold">
              {listing.price != null ? `$${parseFloat(listing.price).toFixed(2)}` : 'Negotiable'}
            </p>
            {listing.status === 'sold' && (
              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">Sold</span>
            )}
          </div>
        </Link>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 mb-4">
        {messages.length === 0 && (
          <p className="text-sm text-shadow-gray dark:text-gray-400 text-center mt-8">No messages yet. Say hello!</p>
        )}
        {messages.map(msg => {
          if (msg.type === 'sale_offer') {
            const senderName = msg.sender_id === user.id ? 'You' : conversation.otherName
            return (
              <div key={msg.id} className="flex justify-center">
                <div className="border border-blue-200 bg-blue-50 rounded-xl p-4 max-w-sm w-full text-center">
                  <p className="text-sm text-blue-900 font-medium">
                    {senderName} offered to confirm this purchase
                  </p>
                  {isSeller && hasPendingOffer && msg.id === pendingOfferMsg?.id && (
                    <button
                      onClick={() => setConfirmModalOpen(true)}
                      className="mt-2 text-sm font-medium text-blue-700 hover:text-blue-900 underline"
                    >
                      Confirm Sale →
                    </button>
                  )}
                  <p className="text-xs text-blue-400 mt-1">{formatMsgTime(msg.created_at)}</p>
                </div>
              </div>
            )
          }

          if (msg.type === 'sale_confirmed') {
            return (
              <div key={msg.id} className="flex justify-center">
                <div className="border border-green-200 bg-green-50 rounded-xl p-4 max-w-sm w-full text-center">
                  <p className="text-sm text-green-800 font-semibold">✓ Sale confirmed</p>
                  <p className="text-xs text-green-600 mt-0.5">{formatMsgTime(msg.created_at)}</p>
                </div>
              </div>
            )
          }

          const isMe = msg.sender_id === user.id
          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              <div
                className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm ${
                  isMe
                    ? 'bg-maroon text-white rounded-br-sm'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-sm'
                }`}
              >
                {msg.content}
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 px-1">{formatMsgTime(msg.created_at)}</p>
            </div>
          )
        })}

        {/* Inline review prompt */}
        {showReviewPrompt && (
          <div className="flex justify-center">
            <div className="border border-yellow-200 bg-yellow-50 rounded-xl p-4 max-w-sm w-full">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-3">
                Leave <span className="font-semibold">{conversation.otherName}</span> a review!
              </p>
              <form onSubmit={handleSubmitReview} className="space-y-2">
                <StarPicker rating={reviewRating} onChange={setReviewRating} />
                <textarea
                  value={reviewComment}
                  onChange={e => setReviewComment(e.target.value)}
                  rows={2}
                  maxLength={500}
                  placeholder="Share your experience… (optional)"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon resize-none bg-white dark:bg-gray-900 dark:text-gray-100"
                />
                {reviewError && <p className="text-xs text-destructive">{reviewError}</p>}
                <Button
                  type="submit"
                  disabled={reviewSubmitting}
                  className="bg-maroon hover:bg-maroon-light text-white text-sm py-1.5 h-auto w-full"
                >
                  {reviewSubmitting ? 'Submitting…' : 'Submit Review'}
                </Button>
              </form>
            </div>
          </div>
        )}

        {reviewDone && (
          <div className="flex justify-center">
            <div className="border border-green-200 bg-green-50 rounded-xl p-3 max-w-sm w-full text-center">
              <p className="text-sm text-green-800 font-semibold">✓ Review submitted!</p>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Offer Sale button (buyer only, listing active, no offer yet) */}
      {canOffer && (
        <button
          onClick={() => setOfferModalOpen(true)}
          className="w-full border border-maroon text-maroon rounded-xl py-2 text-sm font-medium hover:bg-maroon hover:text-white transition-colors mb-2"
        >
          Offer Sale
        </button>
      )}

      {/* Input */}
      <form onSubmit={handleSend} className="flex gap-2">
        <Input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Type a message…"
          disabled={sending}
          className="flex-1"
        />
        <Button
          type="submit"
          disabled={sending || !text.trim()}
          className="bg-maroon hover:bg-maroon-light text-white"
        >
          Send
        </Button>
      </form>

      {/* Offer Sale modal (buyer) */}
      <Modal open={offerModalOpen} onClose={() => setOfferModalOpen(false)}>
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">Before you confirm</h2>
        <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-2 mb-5 list-disc list-inside">
          <li>Take a photo of the item as proof of the transaction.</li>
          <li>Only confirm once you've physically received the item.</li>
          <li>Only confirm once you've paid the seller.</li>
        </ul>
        <div className="flex flex-col gap-2">
          <Button
            onClick={handleConfirmOffer}
            disabled={processingAction}
            className="bg-maroon hover:bg-maroon-light text-white w-full"
          >
            {processingAction ? 'Sending…' : "I've received it and paid — Confirm"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => setOfferModalOpen(false)}
            className="w-full text-gray-500 dark:text-gray-400"
          >
            Cancel
          </Button>
        </div>
      </Modal>

      {/* Confirm Sale modal (seller) */}
      <Modal open={confirmModalOpen} onClose={() => setConfirmModalOpen(false)}>
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">Confirm sale</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
          Have you received payment from{' '}
          <span className="font-semibold">{conversation.otherName}</span>?
          This will mark the listing as sold.
        </p>
        <div className="flex flex-col gap-2">
          <Button
            onClick={handleConfirmSale}
            disabled={processingAction}
            className="bg-maroon hover:bg-maroon-light text-white w-full"
          >
            {processingAction ? 'Confirming…' : 'Yes, confirm sale'}
          </Button>
          <Button
            variant="ghost"
            onClick={() => setConfirmModalOpen(false)}
            className="w-full text-gray-500 dark:text-gray-400"
          >
            Cancel
          </Button>
        </div>
      </Modal>
    </div>
  )
}
