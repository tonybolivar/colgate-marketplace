import { useEffect } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import HomePage from '@/pages/HomePage'
import RegisterPage from '@/pages/RegisterPage'
import LoginPage from '@/pages/LoginPage'
import VerifyEmailPage from '@/pages/VerifyEmailPage'
import AuthCallbackPage from '@/pages/AuthCallbackPage'
import AccountPage from '@/pages/AccountPage'
import CreateListingPage from '@/pages/CreateListingPage'
import BrowsePage from '@/pages/BrowsePage'
import ListingDetailPage from '@/pages/ListingDetailPage'
import MessagesPage from '@/pages/MessagesPage'
import ConversationPage from '@/pages/ConversationPage'

function App() {
  const navigate = useNavigate()

  useEffect(() => {
    // Supabase implicit flow puts auth results in the hash fragment.
    // Intercept them here and send to /auth/callback for proper handling.
    const hash = window.location.hash
    if (hash && (hash.includes('type=signup') || hash.includes('error_code=otp'))) {
      navigate('/auth/callback', { replace: true })
    }
  }, [navigate])

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/listings/new" element={<CreateListingPage />} />
          <Route path="/listings/:id" element={<ListingDetailPage />} />
          <Route path="/browse" element={<BrowsePage />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/messages/:conversationId" element={<ConversationPage />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}

export default App
