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
          className={`w-6 h-6 transition-colors ${i < rating ? 'text-yellow-400' : 'text-gray-300'} hover:text-yellow-400`}
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

  // Review prompt state
  const [showReviewPrompt, setShowReviewPrompt] = useState(false)
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  const [reviewError, setReviewError] = useState('')

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
          setMessages(prev => [...prev, payload.new])
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
      .select(`id, buyer_id, seller_id, listings(id, title, price, images, status, sold_to_buyer_id, seller_id)`)
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
      .select('full_name')
      .eq('id', otherId)
      .single()

    setConversation({ ...conv, otherName: otherProfile?.full_name || 'Unknown' })

    // Check review eligibility: buyer is confirmed purchaser and hasn't reviewed yet
    const listing = conv.listings
    if (listing && listing.sold_to_buyer_id === user.id) {
      const { data: existing } = await supabase
        .from('reviews')
        .select('id')
        .eq('listing_id', listing.id)
        .eq('reviewer_id', user.id)
        .maybeSingle()
      if (!existing) {
        setShowReviewPrompt(true)
      }
    }

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
    if (!text.trim()) return
    setSending(true)
    const { error } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: text.trim(),
    })
    if (!error) setText('')
    setSending(false)
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

    setShowReviewPrompt(false)
    setReviewSubmitting(false)
  }

  if (!user) return null

  if (loading) {
    return <div className="max-w-2xl mx-auto px-4 py-12 text-shadow-gray">Loading…</div>
  }

  const listing = conversation.listings

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="mb-4">
        <Link to="/messages" className="text-sm text-shadow-gray hover:text-maroon">← Messages</Link>
        <h1 className="text-lg font-bold text-gray-900 mt-1">{conversation.otherName}</h1>
        {listing?.title && (
          <Link
            to={`/listings/${listing.id}`}
            className="text-sm text-maroon hover:underline"
          >
            Re: {listing.title}
          </Link>
        )}
      </div>

      {/* Listing card */}
      {listing?.title && (
        <Link
          to={`/listings/${listing.id}`}
          className="flex items-center gap-3 border rounded-xl p-3 mb-4 bg-white hover:shadow-md transition-shadow"
        >
          <div className="w-14 h-14 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
            {listing.images && listing.images.length > 0 ? (
              <img src={listing.images[0]} alt={listing.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No photo</div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{listing.title}</p>
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
          <p className="text-sm text-shadow-gray text-center mt-8">No messages yet. Say hello!</p>
        )}
        {messages.map(msg => {
          const isMe = msg.sender_id === user.id
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm ${
                  isMe
                    ? 'bg-maroon text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                }`}
              >
                {msg.content}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Review prompt banner */}
      {showReviewPrompt && (
        <div className="border border-yellow-200 bg-yellow-50 rounded-xl p-4 mb-3 space-y-3">
          <p className="text-sm font-medium text-gray-800">
            You bought this item! Leave <span className="font-semibold">{conversation.otherName}</span> a review.
          </p>
          <form onSubmit={handleSubmitReview} className="space-y-2">
            <StarPicker rating={reviewRating} onChange={setReviewRating} />
            <textarea
              value={reviewComment}
              onChange={e => setReviewComment(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="Share your experience… (optional)"
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon resize-none bg-white"
            />
            {reviewError && <p className="text-xs text-destructive">{reviewError}</p>}
            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={reviewSubmitting}
                className="bg-maroon hover:bg-maroon-light text-white text-sm py-1.5 h-auto"
              >
                {reviewSubmitting ? 'Submitting…' : 'Submit Review'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowReviewPrompt(false)}
                className="text-sm text-gray-500 py-1.5 h-auto"
              >
                Dismiss
              </Button>
            </div>
          </form>
        </div>
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
    </div>
  )
}
