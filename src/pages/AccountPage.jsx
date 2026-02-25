import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const CURRENT_YEAR = new Date().getFullYear()
const CLASS_YEARS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR + i)

const selectClass = 'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

export default function AccountPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [profile, setProfile] = useState({ full_name: '', account_type: 'student', class_year: '' })
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' })

  const [passwords, setPasswords] = useState({ newPassword: '', confirmPassword: '' })
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' })

  useEffect(() => {
    if (user === null) navigate('/login', { replace: true })
  }, [user, navigate])

  useEffect(() => {
    if (user) {
      setProfile({
        full_name: user.user_metadata?.full_name || '',
        account_type: user.user_metadata?.account_type || 'student',
        class_year: user.user_metadata?.class_year || '',
      })
    }
  }, [user])

  async function handleProfileSave(e) {
    e.preventDefault()
    setProfileSaving(true)
    setProfileMsg({ type: '', text: '' })

    const data = { full_name: profile.full_name, account_type: profile.account_type }
    if (profile.account_type === 'student') data.class_year = profile.class_year
    else data.class_year = null

    const { error } = await supabase.auth.updateUser({ data })
    if (!error) {
      await supabase.from('profiles').upsert({
        id: user.id,
        full_name: data.full_name,
        account_type: data.account_type,
        class_year: data.class_year ? parseInt(data.class_year) : null,
      })
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

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/')
  }

  if (!user) return null

  return (
    <div className="max-w-lg mx-auto px-4 py-12 space-y-6">

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileSave} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Display name</label>
              <Input
                value={profile.full_name}
                onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))}
                placeholder="Your name"
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
                  {CLASS_YEARS.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
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

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSave} className="space-y-4">
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
        </CardContent>
      </Card>

      {/* Seller profile */}
      <Card>
        <CardContent className="pt-6 flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900 text-sm">Your seller profile</p>
            <p className="text-xs text-gray-500 mt-0.5">View your listings, reviews, and public profile</p>
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
