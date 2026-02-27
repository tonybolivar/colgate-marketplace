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
  const [tab, setTab] = useState('pending') // 'pending' | 'rejected' | 'reports'
  const [actionLoading, setActionLoading] = useState(null)
  const [actionError, setActionError] = useState('')

  // Reports tab state
  const [listingReports, setListingReports] = useState([])
  const [convReports, setConvReports] = useState([])
  const [reportsLoading, setReportsLoading] = useState(false)
  const [reportSubTab, setReportSubTab] = useState('listings') // 'listings' | 'conversations'
  const [expandedConvId, setExpandedConvId] = useState(null)
  const [convMessages, setConvMessages] = useState({}) // { [convId]: msgs[] }

  useEffect(() => {
    if (user === null) { navigate('/login', { replace: true }); return }
    if (user && !isAdmin) { navigate('/', { replace: true }); return }
  }, [user, isAdmin, navigate])

  useEffect(() => {
    if (!user || !isAdmin) return
    if (tab === 'reports') {
      fetchReports()
    } else {
      fetchListings()
    }
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

  async function fetchReports() {
    setReportsLoading(true)

    // Fetch listing reports with listing details
    const { data: lr } = await supabase
      .from('listing_reports')
      .select('id, reporter_id, listing_id, reason, details, created_at, listings(id, title, images, status)')
      .order('created_at', { ascending: false })

    // Group by listing_id
    const grouped = {}
    for (const r of lr || []) {
      if (!r.listings) continue
      const lid = r.listing_id
      if (!grouped[lid]) {
        grouped[lid] = { listing: r.listings, reports: [] }
      }
      grouped[lid].reports.push({ id: r.id, reporter_id: r.reporter_id, reason: r.reason, details: r.details, created_at: r.created_at })
    }
    setListingReports(Object.values(grouped))

    // Fetch conversation reports with conversation + listing details
    const { data: cr } = await supabase
      .from('conversation_reports')
      .select('id, reporter_id, conversation_id, reason, details, created_at, conversations(id, buyer_id, seller_id, listing_id, listings(title))')
      .order('created_at', { ascending: false })

    // Enrich with profile names
    const participantIds = [...new Set((cr || []).flatMap(r => [r.conversations?.buyer_id, r.conversations?.seller_id].filter(Boolean)))]
    let profileMap = {}
    if (participantIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, full_name')
        .in('id', participantIds)
      profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p.display_name || p.full_name || 'Unknown']))
    }

    setConvReports((cr || []).map(r => ({
      ...r,
      buyerName: profileMap[r.conversations?.buyer_id] || 'Unknown',
      sellerName: profileMap[r.conversations?.seller_id] || 'Unknown',
    })))

    setReportsLoading(false)
  }

  async function loadConvMessages(convId) {
    if (convMessages[convId]) {
      setExpandedConvId(expandedConvId === convId ? null : convId)
      return
    }
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })
    setConvMessages(prev => ({ ...prev, [convId]: data || [] }))
    setExpandedConvId(convId)
  }

  async function handleDismissListingReports(listingId) {
    setActionLoading(listingId)
    await supabase.from('listing_reports').delete().eq('listing_id', listingId)
    setListingReports(prev => prev.filter(g => g.listing.id !== listingId))
    setActionLoading(null)
  }

  async function handleRemoveListing(listingId) {
    setActionLoading(listingId)
    await supabase.from('listings').update({ status: 'archived' }).eq('id', listingId)
    await supabase.from('listing_reports').delete().eq('listing_id', listingId)
    setListingReports(prev => prev.filter(g => g.listing.id !== listingId))
    setActionLoading(null)
  }

  async function handleDismissConvReport(reportId) {
    setActionLoading(reportId)
    await supabase.from('conversation_reports').delete().eq('id', reportId)
    setConvReports(prev => prev.filter(r => r.id !== reportId))
    setActionLoading(null)
  }

  async function handleApprove(id) {
    setActionLoading(id)
    setActionError('')
    const { error } = await supabase.from('listings').update({ approval_status: 'approved' }).eq('id', id)
    if (error) { setActionError(`Approve failed: ${error.message}`); setActionLoading(null); return }
    setListings(prev => prev.filter(l => l.id !== id))
    setActionLoading(null)
  }

  async function handleReject(id) {
    setActionLoading(id)
    setActionError('')
    const { error } = await supabase.from('listings').update({ approval_status: 'rejected' }).eq('id', id)
    if (error) { setActionError(`Reject failed: ${error.message}`); setActionLoading(null); return }
    setListings(prev => prev.filter(l => l.id !== id))
    setActionLoading(null)
  }

  async function handleRestore(id) {
    setActionLoading(id)
    setActionError('')
    const { error } = await supabase.from('listings').update({ approval_status: 'pending' }).eq('id', id)
    if (error) { setActionError(`Restore failed: ${error.message}`); setActionLoading(null); return }
    setListings(prev => prev.filter(l => l.id !== id))
    setActionLoading(null)
  }

  async function handleDelete(id) {
    setActionLoading(id)
    setActionError('')
    const { error } = await supabase.from('listings').delete().eq('id', id)
    if (error) { setActionError(`Delete failed: ${error.message}`); setActionLoading(null); return }
    setListings(prev => prev.filter(l => l.id !== id))
    setActionLoading(null)
  }

  if (!user || !isAdmin) return null

  const categoryLabel = (cat) => CATEGORIES.find(c => c.value === cat)?.label || cat

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Admin — Listing Approvals</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Review and approve or reject submitted listings.</p>
      {actionError && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950 rounded-lg px-3 py-2 mb-4">{actionError}</p>}

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {['pending', 'rejected', 'reports'].map(t => (
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

      {/* Pending / Rejected tabs */}
      {tab !== 'reports' && (
        loading ? (
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
        )
      )}

      {/* Reports tab */}
      {tab === 'reports' && (
        <div>
          {/* Sub-tab pills */}
          <div className="flex gap-2 mb-5">
            {['listings', 'conversations'].map(st => (
              <button
                key={st}
                onClick={() => setReportSubTab(st)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize ${
                  reportSubTab === st
                    ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {st === 'listings' ? 'Listing Reports' : 'Conversation Reports'}
              </button>
            ))}
          </div>

          {reportsLoading ? (
            <p className="text-shadow-gray dark:text-gray-400">Loading…</p>
          ) : reportSubTab === 'listings' ? (
            listingReports.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm">No listing reports.</p>
            ) : (
              <div className="space-y-4">
                {listingReports.map(({ listing, reports }) => (
                  <div key={listing.id} className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 shadow-sm p-4">
                    <div className="flex gap-3 mb-3">
                      <div className="w-14 h-14 rounded-lg bg-gray-100 dark:bg-gray-800 overflow-hidden flex-shrink-0">
                        {listing.images && listing.images.length > 0 ? (
                          <img src={listing.images[0]} alt={listing.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500 text-xs">No photo</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link to={`/listings/${listing.id}`} className="font-semibold text-sm text-gray-900 dark:text-gray-100 hover:text-maroon hover:underline">
                          {listing.title}
                        </Link>
                        {listing.status === 'archived' && (
                          <span className="ml-2 text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded-full">Archived</span>
                        )}
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {reports.length} report{reports.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>

                    {/* Report list */}
                    <div className="space-y-1.5 mb-3">
                      {reports.map(r => (
                        <div key={r.id} className="text-xs bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
                          <span className="font-medium text-gray-700 dark:text-gray-300">{r.reason}</span>
                          {r.details && <span className="text-gray-500 dark:text-gray-400"> — {r.details}</span>}
                          <span className="text-gray-400 dark:text-gray-500 ml-2">
                            {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleDismissListingReports(listing.id)}
                        disabled={actionLoading === listing.id}
                        variant="outline"
                        className="text-xs h-8 px-3"
                      >
                        Dismiss Reports
                      </Button>
                      {listing.status !== 'archived' && (
                        <Button
                          onClick={() => handleRemoveListing(listing.id)}
                          disabled={actionLoading === listing.id}
                          variant="destructive"
                          className="text-xs h-8 px-3"
                        >
                          Remove Listing
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            convReports.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm">No conversation reports.</p>
            ) : (
              <div className="space-y-4">
                {convReports.map(r => (
                  <div key={r.id} className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 shadow-sm p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {r.buyerName} ↔ {r.sellerName}
                        </p>
                        {r.conversations?.listings?.title && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            Re: {r.conversations.listings.title}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          <span className="font-medium">{r.reason}</span>
                          {r.details && ` — ${r.details}`}
                        </p>
                      </div>
                      <p className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                        {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>

                    <div className="flex gap-2 mb-2">
                      <button
                        onClick={() => loadConvMessages(r.conversation_id)}
                        className="text-xs text-maroon hover:underline"
                      >
                        {expandedConvId === r.conversation_id ? 'Hide messages' : 'View messages'}
                      </button>
                      <Button
                        onClick={() => handleDismissConvReport(r.id)}
                        disabled={actionLoading === r.id}
                        variant="outline"
                        className="text-xs h-7 px-3"
                      >
                        Dismiss
                      </Button>
                    </div>

                    {/* Expanded messages */}
                    {expandedConvId === r.conversation_id && convMessages[r.conversation_id] && (
                      <div className="mt-2 max-h-64 overflow-y-auto border border-gray-100 dark:border-gray-800 rounded-lg p-3 space-y-2 bg-gray-50 dark:bg-gray-800/50">
                        {convMessages[r.conversation_id].length === 0 ? (
                          <p className="text-xs text-gray-400 dark:text-gray-500">No messages.</p>
                        ) : convMessages[r.conversation_id].map(msg => (
                          <div key={msg.id} className="text-xs">
                            <span className={`font-medium ${msg.sender_id === r.conversations?.buyer_id ? 'text-blue-600 dark:text-blue-400' : 'text-green-600 dark:text-green-400'}`}>
                              {msg.sender_id === r.conversations?.buyer_id ? r.buyerName : r.sellerName}
                            </span>
                            <span className="text-gray-400 dark:text-gray-500 ml-1">
                              {new Date(msg.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                            </span>
                            <p className="text-gray-700 dark:text-gray-300 mt-0.5">{msg.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      )}
    </div>
  )
}
