import { Link } from 'react-router-dom'
import { CATEGORIES } from '@/lib/categories'

const RECENTLY_VIEWED_KEY = 'colgate_recently_viewed'

const conditionColors = {
  new: 'bg-green-100 text-green-800',
  like_new: 'bg-blue-100 text-blue-800',
  good: 'bg-yellow-100 text-yellow-800',
  fair: 'bg-orange-100 text-orange-800',
  poor: 'bg-red-100 text-red-800',
}

export default function RecentlyViewed() {
  let items = []
  try {
    items = JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) || '[]')
  } catch {
    return null
  }

  if (!items || items.length === 0) return null

  return (
    <section className="max-w-6xl mx-auto px-4 py-8">
      <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Recently Viewed</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {items.map(listing => (
          <Link
            key={listing.id}
            to={`/listings/${listing.id}`}
            className="group border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden hover:border-maroon hover:shadow-md transition-all"
          >
            <div className="aspect-square bg-gray-100 dark:bg-gray-800 overflow-hidden">
              {listing.images && listing.images.length > 0 ? (
                <img
                  src={listing.images[0]}
                  alt={listing.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500 text-xs">
                  No photo
                </div>
              )}
            </div>
            <div className="p-2 space-y-0.5">
              <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate group-hover:text-maroon transition-colors">
                {listing.title}
              </p>
              <p className="text-xs text-maroon font-bold">
                {listing.price != null ? `$${parseFloat(listing.price).toFixed(2)}` : 'Negotiable'}
              </p>
              <div className="flex items-center gap-1 flex-wrap">
                {listing.condition && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${conditionColors[listing.condition] || 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>
                    {listing.condition.replace('_', ' ')}
                  </span>
                )}
                <span className="text-xs text-gray-400 dark:text-gray-500 capitalize">
                  {CATEGORIES.find(c => c.value === listing.category)?.label || listing.category}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
