import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import TermsContent from '@/components/TermsContent'
import PrivacyContent from '@/components/PrivacyContent'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ fullName: '', displayName: '', email: '', password: '', confirmPassword: '' })
  const [agreed, setAgreed] = useState(false)
  const [modal, setModal] = useState(null) // 'terms' | 'privacy' | null
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)

  function validate() {
    const e = {}
    if (!form.fullName.trim()) e.fullName = 'Full name is required.'
    if (!form.displayName.trim()) e.displayName = 'Display name is required.'
    if (!form.email.endsWith('@colgate.edu')) e.email = 'Must be a @colgate.edu email address.'
    if (form.password.length < 8) e.password = 'Password must be at least 8 characters.'
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match.'
    if (!agreed) e.agreed = 'You must agree to continue.'
    return e
  }

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setErrors(prev => ({ ...prev, [e.target.name]: '' }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    setLoading(true)
    setServerError('')

    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { full_name: form.fullName.trim(), display_name: form.displayName.trim() },
      },
    })

    setLoading(false)

    if (error) {
      setServerError(error.message)
    } else if (data?.user?.identities?.length === 0) {
      // Supabase silently ignores duplicate emails — identities=[] reveals it
      setServerError('An account with this email already exists. Please log in instead.')
    } else {
      navigate('/verify-email', { state: { email: form.email } })
    }
  }

  return (
    <>
    <div className="min-h-[calc(100vh-120px)] flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Create your account</CardTitle>
          <CardDescription>Join the Colgate Marketplace with your university email.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="fullName">Full name</label>
              <Input
                id="fullName"
                name="fullName"
                placeholder="Jane Doe"
                value={form.fullName}
                onChange={handleChange}
                autoComplete="name"
              />
              <p className="text-xs text-muted-foreground">Used for verification only — cannot be changed later.</p>
              {errors.fullName && <p className="text-xs text-destructive">{errors.fullName}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="displayName">Display name</label>
              <Input
                id="displayName"
                name="displayName"
                placeholder="Jane"
                value={form.displayName}
                onChange={handleChange}
                autoComplete="nickname"
              />
              <p className="text-xs text-muted-foreground">Shown publicly on your listings and profile.</p>
              {errors.displayName && <p className="text-xs text-destructive">{errors.displayName}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="email">Colgate email</label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@colgate.edu"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
              />
              <p className="text-xs text-muted-foreground">Must be a @colgate.edu address — cannot be changed later.</p>
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="password">Password</label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Min. 8 characters"
                value={form.password}
                onChange={handleChange}
                autoComplete="new-password"
              />
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="confirmPassword">Confirm password</label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Repeat password"
                value={form.confirmPassword}
                onChange={handleChange}
                autoComplete="new-password"
              />
              {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword}</p>}
            </div>

            <div className="space-y-1">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={e => { setAgreed(e.target.checked); setErrors(prev => ({ ...prev, agreed: '' })) }}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-maroon flex-shrink-0"
                />
                <span className="text-sm text-gray-700">
                  I agree to the{' '}
                  <button type="button" onClick={() => setModal('terms')} className="text-maroon hover:underline font-medium">Terms of Service</button>
                  {' '}and{' '}
                  <button type="button" onClick={() => setModal('privacy')} className="text-maroon hover:underline font-medium">Privacy Policy</button>
                  {' '}and consent to receiving marketing emails from Colgate Marketplace.
                </span>
              </label>
              {errors.agreed && <p className="text-xs text-destructive">{errors.agreed}</p>}
            </div>

            {serverError && <p className="text-sm text-destructive">{serverError}</p>}

            <Button type="submit" className="w-full bg-maroon hover:bg-maroon-light text-white" disabled={loading}>
              {loading ? 'Creating account…' : 'Create account'}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-maroon hover:underline">Log in</Link>
          </p>
        </CardContent>
      </Card>
    </div>

    {/* Legal document modal */}
    {modal && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
        onClick={() => setModal(null)}
      >
        <div
          className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
            <h2 className="font-semibold text-gray-900">{modal === 'terms' ? 'Terms of Service' : 'Privacy Policy'}</h2>
            <button
              onClick={() => setModal(null)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          <div className="overflow-y-auto px-6 py-5">
            {modal === 'terms' ? <TermsContent /> : <PrivacyContent />}
          </div>
        </div>
      </div>
    )}
    </>
  )
}
