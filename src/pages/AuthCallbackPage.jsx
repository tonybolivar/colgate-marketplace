import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function AuthCallbackPage() {
  const [status, setStatus] = useState('loading') // 'loading' | 'success' | 'error'
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const hash = window.location.hash
    const search = window.location.search
    const hashParams = new URLSearchParams(hash.replace('#', ''))
    const searchParams = new URLSearchParams(search)

    // Check for errors in either hash or query string
    if (hashParams.has('error') || searchParams.has('error')) {
      const desc = hashParams.get('error_description') || searchParams.get('error_description') || ''
      setErrorMsg(desc.replace(/\+/g, ' ') || 'Verification failed.')
      setStatus('error')
      return
    }

    // Listen for the SIGNED_IN event — implicit flow processes the hash async
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setStatus('success')
      }
    })

    // Also check if session is already set (e.g. hash was processed before this ran)
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        setErrorMsg(error.message)
        setStatus('error')
      } else if (session) {
        setStatus('success')
      }
    })

    // Fallback timeout — if nothing resolves in 8s, show error
    const timer = setTimeout(() => {
      setStatus(s => {
        if (s === 'loading') {
          setErrorMsg('Verification link is invalid or has expired.')
          return 'error'
        }
        return s
      })
    }, 8000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timer)
    }
  }, [])

  if (status === 'loading') {
    return (
      <div className="min-h-[calc(100vh-120px)] flex items-center justify-center">
        <p className="text-muted-foreground">Verifying your email…</p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-[calc(100vh-120px)] flex items-center justify-center px-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto mb-4 text-5xl">❌</div>
            <CardTitle className="text-2xl">Verification failed</CardTitle>
            <CardDescription>{errorMsg}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="bg-maroon hover:bg-maroon-light text-white">
              <Link to="/register">Back to register</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-120px)] flex items-center justify-center px-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 text-5xl">✅</div>
          <CardTitle className="text-2xl">Email verified!</CardTitle>
          <CardDescription>
            Your Colgate Marketplace account is ready. You can now log in and start browsing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="bg-maroon hover:bg-maroon-light text-white w-full">
            <Link to="/login">Go to login</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
