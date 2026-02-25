import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function AccountPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user === null) navigate('/login', { replace: true })
  }, [user, navigate])

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/')
  }

  if (!user) return null

  const fullName = user.user_metadata?.full_name || '—'
  const email = user.email

  return (
    <div className="min-h-[calc(100vh-120px)] flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium">{fullName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium">{email}</span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={handleSignOut}
          >
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
