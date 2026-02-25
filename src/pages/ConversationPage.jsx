import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

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
      .select(`
        id,
        buyer_id,
        seller_id,
        listings(id, title),
        buyer:profiles!conversations_buyer_id_fkey(full_name),
        seller:profiles!conversations_seller_id_fkey(full_name)
      `)
      .eq('id', conversationId)
      .single()

    if (convErr || !conv) {
      navigate('/messages', { replace: true })
      return
    }

    // Verify participant
    if (conv.buyer_id !== user.id && conv.seller_id !== user.id) {
      navigate('/messages', { replace: true })
      return
    }

    setConversation(conv)

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

  if (!user) return null

  if (loading) {
    return <div className="max-w-2xl mx-auto px-4 py-12 text-shadow-gray">Loading…</div>
  }

  const isBuyer = conversation.buyer_id === user.id
  const otherName = isBuyer
    ? conversation.seller?.full_name || 'Unknown'
    : conversation.buyer?.full_name || 'Unknown'

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="mb-4">
        <Link to="/messages" className="text-sm text-shadow-gray hover:text-maroon">← Messages</Link>
        <h1 className="text-lg font-bold text-gray-900 mt-1">{otherName}</h1>
        {conversation.listings?.title && (
          <Link
            to={`/listings/${conversation.listings.id}`}
            className="text-sm text-maroon hover:underline"
          >
            Re: {conversation.listings.title}
          </Link>
        )}
      </div>

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
