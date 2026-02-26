import { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [serverError, setServerError] = useState('')
  const passwordReset = location.state?.passwordReset
  const [warning, setWarning] = useState(null) // { reason } — shown after login for warned users
  const [loading, setLoading] = useState(false)

  // Redirect once the auth context confirms the user is logged in (skip if showing warning)
  useEffect(() => {
    if (user && !warning) navigate('/', { replace: true })
  }, [user, warning, navigate])

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setServerError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setServerError('')
    const { data, error } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    })
    setLoading(false)

    if (error) {
      setServerError(error.message)
    } else if (!data.user?.email_confirmed_at) {
      await supabase.auth.signOut()
      navigate('/verify-email', { state: { email: form.email } })
    } else {
      // Check account status
      const { data: profile } = await supabase
        .from('profiles')
        .select('status, warn_reason')
        .eq('id', data.user.id)
        .maybeSingle()
      if (profile?.status === 'banned') {
        await supabase.auth.signOut()
        setServerError('Your account has been permanently suspended for violations of our Terms of Service.')
      } else if (profile?.status === 'suspended') {
        await supabase.auth.signOut()
        setServerError('Your account has been temporarily suspended. Please contact colgatemarketplace13@gmail.com for more information.')
      } else if (profile?.status === 'warned') {
        setWarning({ reason: profile.warn_reason })
      }
    }
  }

  if (warning) {
    return (
      <div className="min-h-[calc(100vh-120px)] flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="mx-auto mb-3 text-4xl">⚠️</div>
            <CardTitle className="text-xl text-center">Your account has a warning</CardTitle>
            <CardDescription className="text-center">
              An admin has issued a warning on your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-sm text-yellow-800">
              <p className="font-medium mb-1">Reason:</p>
              <p>{warning.reason || 'No reason provided.'}</p>
            </div>
            <p className="text-xs text-gray-500 text-center">
              Further violations may result in suspension or a permanent ban.
            </p>
            <Button
              onClick={() => { setWarning(null); navigate('/') }}
              className="w-full bg-maroon hover:bg-maroon-light text-white"
            >
              I understand, continue
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-120px)] flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Welcome back</CardTitle>
          <CardDescription>Log in to your Colgate Marketplace account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="email">Email</label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@colgate.edu"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="password">Password</label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Your password"
                value={form.password}
                onChange={handleChange}
                autoComplete="current-password"
              />
            </div>

            {passwordReset && (
              <p className="text-sm text-green-600">Password updated! Log in with your new password.</p>
            )}
            {serverError && (
              <div className="space-y-1">
                <p className="text-sm text-destructive">{serverError}</p>
                {serverError.toLowerCase().includes('invalid') && (
                  <p className="text-sm text-muted-foreground">
                    <Link to="/forgot-password" className="text-maroon hover:underline font-medium">
                      Forgot your password?
                    </Link>
                  </p>
                )}
              </div>
            )}

            <Button type="submit" className="w-full bg-maroon hover:bg-maroon-light text-white" disabled={loading}>
              {loading ? 'Logging in…' : 'Log in'}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Don't have an account?{' '}
            <Link to="/register" className="font-medium text-maroon hover:underline">Sign up</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
