import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

export default function AuthCallbackPage() {
  const navigate = useNavigate()
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        setError(error.message)
      } else if (session) {
        navigate('/', { replace: true })
      } else {
        setError('Verification failed or link has expired. Please try registering again.')
      }
    })
  }, [navigate])

  if (error) {
    return (
      <div className="min-h-[calc(100vh-120px)] flex items-center justify-center px-4">
        <div className="text-center space-y-3">
          <p className="text-destructive font-medium">{error}</p>
          <a href="/register" className="text-sm text-maroon hover:underline">Back to register</a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-120px)] flex items-center justify-center">
      <p className="text-muted-foreground">Verifying your email…</p>
    </div>
  )
}
