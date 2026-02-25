import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export default function NotFoundPage() {
  return (
    <div className="min-h-[calc(100vh-120px)] flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-8xl font-bold text-maroon mb-4">404</p>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Page not found</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">The page you're looking for doesn't exist.</p>
        <Button asChild className="bg-maroon hover:bg-maroon-light text-white">
          <Link to="/">Go home</Link>
        </Button>
      </div>
    </div>
  )
}
