import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'

export default function Navbar() {
  const { user } = useAuth()

  return (
    <nav className="bg-maroon text-white shadow-md">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3">
          <ColgateShield />
          <div className="leading-tight">
            <div className="font-bold text-lg tracking-wide">Colgate</div>
            <div className="text-xs text-winter-gray tracking-widest uppercase">Marketplace</div>
          </div>
        </Link>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link to="/browse" className="hover:text-winter-gray transition-colors">Browse</Link>
          {user && (
            <Link to="/messages" className="hover:text-winter-gray transition-colors">Messages</Link>
          )}
        </div>

        {/* Auth buttons */}
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Button variant="ghost" className="text-white hover:text-white hover:bg-maroon-light text-sm font-semibold" asChild>
                <Link to="/listings/new">Post Listing</Link>
              </Button>
              <Button className="bg-white text-maroon hover:bg-winter-gray text-sm font-semibold" asChild>
                <Link to="/account">Account</Link>
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" className="text-white hover:text-white hover:bg-maroon-light text-sm" asChild>
                <Link to="/login">Log in</Link>
              </Button>
              <Button className="bg-white text-maroon hover:bg-winter-gray text-sm font-semibold" asChild>
                <Link to="/register">Sign up</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}


function ColgateShield() {
  return (
    <svg width="36" height="40" viewBox="0 0 36 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M18 0L0 6V22C0 31.4 8 38.8 18 40C28 38.8 36 31.4 36 22V6L18 0Z"
        fill="white"
      />
      <path
        d="M22.5 12.5C21.2 11.6 19.7 11 18 11C13.6 11 10 14.6 10 19C10 23.4 13.6 27 18 27C19.7 27 21.2 26.4 22.5 25.5V22.2C21.4 23.3 19.8 24 18 24C15.2 24 13 21.8 13 19C13 16.2 15.2 14 18 14C19.8 14 21.4 14.7 22.5 15.8V12.5Z"
        fill="#821019"
      />
    </svg>
  )
}
