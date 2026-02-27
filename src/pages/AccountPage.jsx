import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/hooks/useTheme'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CATEGORIES } from '@/lib/categories'
import { X } from 'lucide-react'

const CURRENT_YEAR = new Date().getFullYear()
const CLASS_YEARS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR + i)

const selectClass = 'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 dark:[color-scheme:dark]'

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors ${
        checked ? 'bg-maroon' : 'bg-gray-300 dark:bg-gray-600'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
        checked ? 'translate-x-4' : 'translate-x-0.5'
      }`} />
    </button>
  )
}

function SettingRow({ label, description, checked, onChange, disabled }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</p>
        {description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>}
      </div>
      <Toggle checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  )
}

const DEFAULT_NOTIF = {
  message_received: true,
  listing_approved: true,
  new_listing: false,
  review_received: true,
  listing_expiring: true,
}

const conditionColors = {
  new: 'bg-green-100 text-green-800',
  like_new: 'bg-blue-100 text-blue-800',
  good: 'bg-yellow-100 text-yellow-800',
  fair: 'bg-orange-100 text-orange-800',
  poor: 'bg-red-100 text-red-800',
}

export default function AccountPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()

  // Profile
  const [profile, setProfile] = useState({ display_name: '', account_type: 'student', class_year: '' })
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' })

  // Password
  const [passwords, setPasswords] = useState({ newPassword: '', confirmPassword: '' })
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' })

  // Notifications
  const [notif, setNotif] = useState(DEFAULT_NOTIF)
  const [notifSaving, setNotifSaving] = useState(false)

  // Saved listings
  const [savedListings, setSavedListings] = useState([])
  const [savedLoading, setSavedLoading] = useState(true)

  useEffect(() => {
    if (user === null) navigate('/login', { replace: true })
  }, [user, navigate])

  useEffect(() => {
    if (!user) return
    setProfile({
      display_name: user.user_metadata?.display_name || '',
      account_type: user.user_metadata?.account_type || 'student',
      class_year: user.user_metadata?.class_year || '',
    })
    // Load notification settings and theme preference from DB
    supabase.from('profiles')
      .select('notification_settings, theme_preference')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.notification_settings) setNotif(s => ({ ...DEFAULT_NOTIF, ...data.notification_settings }))
        if (data?.theme_preference) setTheme(data.theme_preference)
      })

    // Load saved listings
    fetchSavedListings()
  }, [user])

  async function fetchSavedListings() {
    setSavedLoading(true)
    const { data } = await supabase
      .from('saved_listings')
      .select('listing_id, listings(id, title, price, images, category, condition, status)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setSavedListings(
      (data || [])
        .filter(s => s.listings)
        .map(s => s.listings)
    )
    setSavedLoading(false)
  }

  async function handleUnsave(listingId) {
    setSavedListings(prev => prev.filter(l => l.id !== listingId))
    await supabase
      .from('saved_listings')
      .delete()
      .eq('user_id', user.id)
      .eq('listing_id', listingId)
  }

  async function handleProfileSave(e) {
    e.preventDefault()
    setProfileSaving(true)
    setProfileMsg({ type: '', text: '' })
    const data = { display_name: profile.display_name, account_type: profile.account_type }
    if (profile.account_type === 'student') data.class_year = profile.class_year
    else data.class_year = null
    const { error } = await supabase.auth.updateUser({ data })
    if (!error) {
      const oldDisplayName = user.user_metadata?.display_name
      const upsertData = {
        id: user.id,
        display_name: data.display_name,
        account_type: data.account_type,
        class_year: data.class_year ? parseInt(data.class_year) : null,
      }
      // Append old display name to history if it changed
      if (oldDisplayName && oldDisplayName !== data.display_name) {
        const { data: current } = await supabase.from('profiles').select('display_name_history').eq('id', user.id).maybeSingle()
        const history = current?.display_name_history || []
        if (!history.includes(oldDisplayName)) {
          upsertData.display_name_history = [...history, oldDisplayName]
        }
      }
      await supabase.from('profiles').upsert(upsertData)
    }
    setProfileSaving(false)
    setProfileMsg(error
      ? { type: 'error', text: error.message }
      : { type: 'success', text: 'Profile saved.' }
    )
  }

  async function handlePasswordSave(e) {
    e.preventDefault()
    if (passwords.newPassword.length < 8) {
      setPasswordMsg({ type: 'error', text: 'Password must be at least 8 characters.' })
      return
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Passwords do not match.' })
      return
    }
    setPasswordSaving(true)
    setPasswordMsg({ type: '', text: '' })
    const { error } = await supabase.auth.updateUser({ password: passwords.newPassword })
    setPasswordSaving(false)
    if (error) {
      setPasswordMsg({ type: 'error', text: error.message })
    } else {
      setPasswordMsg({ type: 'success', text: 'Password updated.' })
      setPasswords({ newPassword: '', confirmPassword: '' })
    }
  }

  async function handleThemeChange(newTheme) {
    setTheme(newTheme)
    await supabase.from('profiles').update({ theme_preference: newTheme }).eq('id', user.id)
  }

  async function toggleNotif(key) {
    const updated = { ...notif, [key]: !notif[key] }
    setNotif(updated)
    setNotifSaving(true)
    await supabase.from('profiles').update({ notification_settings: updated }).eq('id', user.id)
    setNotifSaving(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/')
  }

  if (!user) return null

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 space-y-6">

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileSave} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Full name</label>
              <Input value={user.user_metadata?.full_name || ''} disabled className="opacity-60 cursor-not-allowed" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Display name</label>
              <Input
                value={profile.display_name}
                onChange={e => setProfile(p => ({ ...p, display_name: e.target.value }))}
                placeholder="Your display name"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Email</label>
              <Input value={user.email} disabled className="opacity-60 cursor-not-allowed" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Role</label>
              <select
                value={profile.account_type}
                onChange={e => setProfile(p => ({ ...p, account_type: e.target.value, class_year: '' }))}
                className={selectClass}
              >
                <option value="student">Student</option>
                <option value="faculty">Faculty</option>
                <option value="staff">Staff</option>
              </select>
            </div>
            {profile.account_type === 'student' && (
              <div className="space-y-1">
                <label className="text-sm font-medium">Class year</label>
                <select
                  value={profile.class_year}
                  onChange={e => setProfile(p => ({ ...p, class_year: e.target.value }))}
                  className={selectClass}
                >
                  <option value="">Select year</option>
                  {CLASS_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            )}
            {profileMsg.text && (
              <p className={`text-sm ${profileMsg.type === 'error' ? 'text-destructive' : 'text-green-600'}`}>
                {profileMsg.text}
              </p>
            )}
            <Button type="submit" className="bg-maroon hover:bg-maroon-light text-white" disabled={profileSaving}>
              {profileSaving ? 'Saving…' : 'Save profile'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Saved Listings */}
      <Card>
        <CardHeader>
          <CardTitle>Saved Listings</CardTitle>
        </CardHeader>
        <CardContent>
          {savedLoading ? (
            <p className="text-sm text-gray-400 dark:text-gray-500">Loading…</p>
          ) : savedListings.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500">No saved listings yet.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {savedListings.map(listing => (
                <div key={listing.id} className="relative group border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                  <Link to={`/listings/${listing.id}`} className="block">
                    <div className="aspect-square bg-gray-100 dark:bg-gray-800 overflow-hidden">
                      {listing.images && listing.images.length > 0 ? (
                        <img src={listing.images[0]} alt={listing.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500 text-xs">No photo</div>
                      )}
                    </div>
                    <div className="p-2 space-y-0.5">
                      <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">{listing.title}</p>
                      <p className="text-xs text-maroon font-bold">
                        {listing.price != null ? `$${parseFloat(listing.price).toFixed(2)}` : 'Negotiable'}
                      </p>
                      <div className="flex items-center gap-1 flex-wrap">
                        {listing.condition && (
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${conditionColors[listing.condition] || 'bg-gray-100 text-gray-700'}`}>
                            {listing.condition.replace('_', ' ')}
                          </span>
                        )}
                        {listing.status === 'sold' && (
                          <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-medium">Sold</span>
                        )}
                      </div>
                    </div>
                  </Link>
                  {/* Unsave button */}
                  <button
                    onClick={() => handleUnsave(listing.id)}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-white/90 dark:bg-gray-900/90 flex items-center justify-center shadow hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                    aria-label="Remove from saved"
                  >
                    <X className="w-3 h-3 text-gray-500 hover:text-red-500" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* Appearance */}
          <div>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Appearance</p>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => handleThemeChange('light')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                  theme === 'light'
                    ? 'border-maroon bg-maroon/5 text-maroon'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                ☀️ Light
              </button>
              <button
                onClick={() => handleThemeChange('dark')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                  theme === 'dark'
                    ? 'border-maroon bg-maroon/5 text-maroon'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                🌙 Dark
              </button>
            </div>
          </div>

          <hr className="border-border" />

          {/* Notifications */}
          <div>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Email Notifications</p>
            <div className="divide-y divide-border">
              <SettingRow
                label="New message"
                description="Email when someone messages you about your listing"
                checked={notif.message_received}
                onChange={() => toggleNotif('message_received')}
                disabled={notifSaving}
              />
              <SettingRow
                label="Listing approved"
                description="Email when your listing is approved by an admin"
                checked={notif.listing_approved}
                onChange={() => toggleNotif('listing_approved')}
                disabled={notifSaving}
              />
              <SettingRow
                label="New listing posted"
                description="Email when a new listing is posted on the marketplace"
                checked={notif.new_listing}
                onChange={() => toggleNotif('new_listing')}
                disabled={notifSaving}
              />
              <SettingRow
                label="New review"
                description="Email when someone leaves you a review"
                checked={notif.review_received}
                onChange={() => toggleNotif('review_received')}
                disabled={notifSaving}
              />
              <SettingRow
                label="Listing expiry reminder"
                description="Remind me 3 days before a listing is auto-archived"
                checked={notif.listing_expiring ?? true}
                onChange={() => toggleNotif('listing_expiring')}
                disabled={notifSaving}
              />
            </div>
          </div>

          <hr className="border-border" />

          {/* Password */}
          <div>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">Change Password</p>
            <form onSubmit={handlePasswordSave} className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">New password</label>
                <Input
                  type="password"
                  value={passwords.newPassword}
                  onChange={e => setPasswords(p => ({ ...p, newPassword: e.target.value }))}
                  placeholder="Min. 8 characters"
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Confirm new password</label>
                <Input
                  type="password"
                  value={passwords.confirmPassword}
                  onChange={e => setPasswords(p => ({ ...p, confirmPassword: e.target.value }))}
                  placeholder="Repeat new password"
                  autoComplete="new-password"
                />
              </div>
              {passwordMsg.text && (
                <p className={`text-sm ${passwordMsg.type === 'error' ? 'text-destructive' : 'text-green-600'}`}>
                  {passwordMsg.text}
                </p>
              )}
              <Button type="submit" className="bg-maroon hover:bg-maroon-light text-white" disabled={passwordSaving}>
                {passwordSaving ? 'Updating…' : 'Update password'}
              </Button>
            </form>
          </div>

        </CardContent>
      </Card>

      {/* Seller profile */}
      <Card>
        <CardContent className="pt-6 flex items-center justify-between">
          <div>
            <p className="font-medium text-sm">Your seller profile</p>
            <p className="text-xs text-muted-foreground mt-0.5">View your listings, reviews, and public profile</p>
          </div>
          <Button asChild variant="outline" className="ml-4 flex-shrink-0">
            <Link to={`/profile/${user.id}`}>View profile</Link>
          </Button>
        </CardContent>
      </Card>

      {/* Sign out */}
      <Button variant="outline" className="w-full" onClick={handleSignOut}>
        Sign out
      </Button>

    </div>
  )
}
