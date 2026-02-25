import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="bg-maroon-dark text-winter-gray" style={{ backgroundColor: '#5e0c12' }}>
      <div className="max-w-6xl mx-auto px-4 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-sm">
          <span className="font-semibold text-white">Colgate Marketplace</span>
          <span className="ml-2">— for the Colgate community</span>
        </div>
        <div className="flex gap-6 text-sm">
          <Link to="/about" className="hover:text-white transition-colors">About</Link>
          <Link to="/contact" className="hover:text-white transition-colors">Contact</Link>
          <Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link>
        </div>
        <div className="text-xs">
          © {new Date().getFullYear()} Colgate Marketplace. Not affiliated with Colgate University.
        </div>
      </div>
    </footer>
  )
}
