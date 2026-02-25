import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { CATEGORIES } from '@/lib/categories'

export default function AdminPage() {
  const { user, isAdmin } = useAuth()
  const navigate = useNavigate()

  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('pending') // 'pending' | 'rejected'
  const [actionLoading, setActionLoading] = useState(null) // listing id being acted on

  useEffect(() => {
    if (user === null) { navigate('/login', { replace: true }); return }
    if (user && !isAdmin) { navigate('/', { replace: true }); return }
  }, [user, isAdmin, navigate])

  useEffect(() => {
    if (!user || !isAdmin) return
    fetchListings()
  }, [user, isAdmin, tab])

  async function fetchListings() {
    setLoading(true)
    const { data } = await supabase
      .from('listings')
      .select('*')
      .eq('approval_status', tab)
      .order('created_at', { ascending: true })

    if (data && data.length > 0) {
      const sellerIds = [...new Set(data.map(l => l.seller_id))]
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', sellerIds)
      const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p.full_name]))
      setListings(data.map(l => ({ ...l, sellerName: profileMap[l.seller_id] || 'Unknown' })))
    } else {
      setListings([])
    }
    setLoading(false)
  }

  async function handleApprove(id) {
    setActionLoading(id)
    await supabase.from('listings').update({ approval_status: 'approved' }).eq('id', id)
    setListings(prev => prev.filter(l => l.id !== id))
    setActionLoading(null)
  }

  async function handleReject(id) {
    setActionLoading(id)
    await supabase.from('listings').update({ approval_status: 'rejected' }).eq('id', id)
    setListings(prev => prev.filter(l => l.id !== id))
    setActionLoading(null)
  }

  async function handleRestore(id) {
    setActionLoading(id)
    await supabase.from('listings').update({ approval_status: 'pending' }).eq('id', id)
    setListings(prev => prev.filter(l => l.id !== id))
    setActionLoading(null)
  }

  async function handleDelete(id) {
    setActionLoading(id)
    await supabase.from('listings').delete().eq('id', id)
    setListings(prev => prev.filter(l => l.id !== id))
    setActionLoading(null)
  }

  if (!user || !isAdmin) return null

  const categoryLabel = (cat) => CATEGORIES.find(c => c.value === cat)?.label || cat

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Admin — Listing Approvals</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Review and approve or reject submitted listings.</p>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {['pending', 'rejected'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors capitalize ${
              tab === t ? 'bg-maroon text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-shadow-gray dark:text-gray-400">Loading…</p>
      ) : listings.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-sm">No {tab} listings.</p>
      ) : (
        <div className="space-y-4">
          {listings.map(listing => (
            <div key={listing.id} className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 shadow-sm p-4 flex gap-4">
              {/* Thumbnail */}
              <div className="w-20 h-20 rounded-lg bg-gray-100 dark:bg-gray-800 overflow-hidden flex-shrink-0">
                {listing.images && listing.images.length > 0 ? (
                  <img src={listing.images[0]} alt={listing.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500 text-xs">No photo</div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link
                      to={`/listings/${listing.id}`}
                      className="font-semibold text-gray-900 dark:text-gray-100 hover:text-maroon hover:underline"
                    >
                      {listing.title}
                    </Link>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {categoryLabel(listing.category)}
                      {listing.price != null ? ` · $${parseFloat(listing.price).toFixed(2)}` : ' · Negotiable'}
                      {' · '}by {listing.sellerName}
                    </p>
                    {listing.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{listing.description}</p>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                    {new Date(listing.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>

                <div className="flex gap-2 mt-3">
                  {tab === 'pending' && (
                    <>
                      <Button
                        onClick={() => handleApprove(listing.id)}
                        disabled={actionLoading === listing.id}
                        className="bg-green-600 hover:bg-green-700 text-white text-sm h-8 px-4"
                      >
                        Approve
                      </Button>
                      <Button
                        onClick={() => handleReject(listing.id)}
                        disabled={actionLoading === listing.id}
                        variant="destructive"
                        className="text-sm h-8 px-4"
                      >
                        Reject
                      </Button>
                    </>
                  )}
                  {tab === 'rejected' && (
                    <>
                      <Button
                        onClick={() => handleRestore(listing.id)}
                        disabled={actionLoading === listing.id}
                        variant="outline"
                        className="text-sm h-8 px-4"
                      >
                        Move to Pending
                      </Button>
                      <Button
                        onClick={() => handleDelete(listing.id)}
                        disabled={actionLoading === listing.id}
                        variant="destructive"
                        className="text-sm h-8 px-4"
                      >
                        Delete
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
