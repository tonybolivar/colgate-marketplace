import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

export default function Hero() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  function handleSearch(e) {
    e.preventDefault()
    if (!user) {
      navigate('/login')
      return
    }
    const params = query.trim() ? `?search=${encodeURIComponent(query.trim())}` : ''
    navigate(`/browse${params}`)
  }

  return (
    <section className="bg-maroon text-white">
      <div className="max-w-6xl mx-auto px-4 py-20 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
          The Marketplace for<br />
          <span className="text-winter-gray">Colgate Students</span>
        </h1>
        <p className="text-lg text-winter-gray mb-10 max-w-xl mx-auto">
          Buy and sell textbooks, furniture, clothes, and more — safely within the Colgate community.
        </p>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="flex max-w-lg mx-auto gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-shadow-gray w-4 h-4" />
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search listings…"
              className="pl-9 bg-white text-black border-0 h-11"
            />
          </div>
          <Button type="submit" className="bg-maple-red hover:bg-red-700 text-white h-11 px-6 font-semibold">
            Search
          </Button>
        </form>

        <p className="mt-4 text-sm text-winter-gray">
          Only accessible with a <span className="font-semibold">@colgate.edu</span> email
        </p>
      </div>
    </section>
  )
}
