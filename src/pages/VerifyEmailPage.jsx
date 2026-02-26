import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function VerifyEmailPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [email, setEmail] = useState(location.state?.email || '')
  const [token, setToken] = useState('')
  const [resent, setResent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)

  async function handleVerify(e) {
    e.preventDefault()
    if (!email) { setError('Please enter your email address.'); return }
    if (token.length !== 8) { setError('Please enter the 8-digit code from your email.'); return }
    setVerifying(true)
    setError('')
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'signup' })
    setVerifying(false)
    if (error) {
      setError(error.message)
    } else {
      navigate('/', { replace: true })
    }
  }

  async function handleResend() {
    if (!email) { setError('Please enter your email address first.'); return }
    setLoading(true)
    setError('')
    setResent(false)
    const { error } = await supabase.auth.resend({ type: 'signup', email })
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setResent(true)
    }
  }

  return (
    <div className="min-h-[calc(100vh-120px)] flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 text-5xl">📬</div>
          <CardTitle className="text-2xl">Check your inbox</CardTitle>
          <CardDescription className="mt-2">
            We sent an 8-digit verification code to your @colgate.edu email. Enter it below to activate your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleVerify} className="space-y-4">
            {!location.state?.email && (
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="email">Email</label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@colgate.edu"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError('') }}
                  autoComplete="email"
                />
              </div>
            )}
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="token">Verification code</label>
              <Input
                id="token"
                type="text"
                inputMode="numeric"
                placeholder="123456"
                maxLength={8}
                value={token}
                onChange={e => { setToken(e.target.value.replace(/\D/g, '')); setError('') }}
                className="text-center text-2xl tracking-[0.3em] font-mono"
                autoComplete="one-time-code"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              type="submit"
              className="w-full bg-maroon hover:bg-maroon-light text-white"
              disabled={verifying || token.length !== 8}
            >
              {verifying ? 'Verifying…' : 'Verify email'}
            </Button>
          </form>

          <div className="text-center space-y-2 pt-2">
            <p className="text-sm text-muted-foreground">
              Didn't receive it? Check your spam folder or resend below.
            </p>
            {resent && <p className="text-sm text-green-600">New code sent!</p>}
            <Button
              variant="outline"
              onClick={handleResend}
              disabled={loading || resent}
              className="w-full"
            >
              {loading ? 'Resending…' : 'Resend code'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
