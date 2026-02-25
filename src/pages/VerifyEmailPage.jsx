import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function VerifyEmailPage() {
  const location = useLocation()
  const email = location.state?.email || ''
  const [resent, setResent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleResend() {
    setLoading(true)
    setError('')
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
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 text-5xl">📬</div>
          <CardTitle className="text-2xl">Check your inbox</CardTitle>
          <CardDescription className="mt-2">
            We sent a confirmation link to{' '}
            <span className="font-medium text-foreground">{email || 'your @colgate.edu email'}</span>.
            Click the link to activate your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Didn't receive it? Check your spam folder or resend below.
          </p>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {resent && (
            <p className="text-sm text-green-600">Confirmation email resent!</p>
          )}
          {email && (
            <Button
              variant="outline"
              onClick={handleResend}
              disabled={loading || resent}
              className="w-full"
            >
              {loading ? 'Resending…' : 'Resend confirmation email'}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
