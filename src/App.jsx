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
import EditListingPage from '@/pages/EditListingPage'
import BrowsePage from '@/pages/BrowsePage'
import ListingDetailPage from '@/pages/ListingDetailPage'
import MessagesPage from '@/pages/MessagesPage'
import ConversationPage from '@/pages/ConversationPage'
import ProfilePage from '@/pages/ProfilePage'
import AdminPage from '@/pages/AdminPage'
import ContactPage from '@/pages/ContactPage'
import AboutPage from '@/pages/AboutPage'
import PrivacyPage from '@/pages/PrivacyPage'
import TermsPage from '@/pages/TermsPage'
import NotFoundPage from '@/pages/NotFoundPage'
import ForgotPasswordPage from '@/pages/ForgotPasswordPage'
import SetupProfilePage from '@/pages/SetupProfilePage'
import ResetPasswordPage from '@/pages/ResetPasswordPage'
import { Toaster } from '@/components/ui/sonner'

function App() {
  const navigate = useNavigate()

  useEffect(() => {
    // Supabase redirects auth results to the site root when /auth/callback
    // isn't in the Redirect URLs allowlist. Forward everything to /auth/callback.
    const hash = window.location.hash
    const search = window.location.search

    const hashIsAuth = hash && (
      hash.includes('access_token') ||
      hash.includes('type=signup') ||
      hash.includes('error=')
    )
    const searchIsAuth = search && (
      search.includes('code=') ||
      search.includes('error=')
    )

    if (hashIsAuth && hash.includes('type=recovery')) {
      navigate(`/reset-password${hash}`, { replace: true })
    } else if (hashIsAuth) {
      navigate(`/auth/callback${hash}`, { replace: true })
    } else if (searchIsAuth) {
      navigate(`/auth/callback${search}`, { replace: true })
    }
  }, [navigate])

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/setup-profile" element={<SetupProfilePage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/listings/new" element={<CreateListingPage />} />
          <Route path="/listings/:id/edit" element={<EditListingPage />} />
          <Route path="/listings/:id" element={<ListingDetailPage />} />
          <Route path="/browse" element={<BrowsePage />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/messages/:conversationId" element={<ConversationPage />} />
          <Route path="/profile/:userId" element={<ProfilePage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <Footer />
      <Toaster position="bottom-right" richColors />
    </div>
  )
}

export default App
