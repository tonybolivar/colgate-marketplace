import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

const CURRENT_YEAR = new Date().getFullYear()
const CLASS_YEARS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR + i)

const selectClass = 'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

export default function SetupProfilePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [accountType, setAccountType] = useState('student')
  const [classYear, setClassYear] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (accountType === 'student' && !classYear) {
      setError('Please select your class year.')
      return
    }
    setSaving(true)
    setError('')
    const data = { account_type: accountType, class_year: accountType === 'student' ? classYear : null }
    const { error: authError } = await supabase.auth.updateUser({ data })
    if (!authError) {
      await supabase.from('profiles').upsert({
        id: user.id,
        account_type: accountType,
        class_year: accountType === 'student' ? parseInt(classYear) : null,
      })
    }
    setSaving(false)
    if (authError) {
      setError(authError.message)
    } else {
      navigate('/', { replace: true })
    }
  }

  if (!user) return null

  return (
    <div className="min-h-[calc(100vh-120px)] flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">One last step</CardTitle>
          <CardDescription>
            Tell us a bit about yourself so we can personalise your experience.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-1">
              <label className="text-sm font-medium">Role</label>
              <select
                value={accountType}
                onChange={e => { setAccountType(e.target.value); setClassYear('') }}
                className={selectClass}
              >
                <option value="student">Student</option>
                <option value="faculty">Faculty</option>
                <option value="staff">Staff</option>
              </select>
            </div>
            {accountType === 'student' && (
              <div className="space-y-1">
                <label className="text-sm font-medium">Class year</label>
                <select
                  value={classYear}
                  onChange={e => { setClassYear(e.target.value); setError('') }}
                  className={selectClass}
                >
                  <option value="">Select year</option>
                  {CLASS_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              type="submit"
              className="w-full bg-maroon hover:bg-maroon-light text-white"
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Get started'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
