const categories = [
  { label: 'Textbooks',   emoji: '📚', desc: 'Course books & study materials' },
  { label: 'Furniture',   emoji: '🛋️', desc: 'Desks, chairs, lamps & more' },
  { label: 'Electronics', emoji: '💻', desc: 'Laptops, cables, accessories' },
  { label: 'Clothing',    emoji: '👕', desc: 'Colgate gear & everyday wear' },
  { label: 'Bikes',       emoji: '🚲', desc: 'Campus transport & outdoor gear' },
  { label: 'Free Stuff',  emoji: '🎁', desc: 'End-of-semester giveaways' },
]

export default function Categories() {
  return (
    <section className="bg-white py-16">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-2xl font-bold text-maroon mb-2 text-center">Browse Categories</h2>
        <p className="text-center text-shadow-gray mb-10">Find what you need from fellow Colgate students</p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <a
              key={cat.label}
              href="#"
              className="group border border-winter-gray rounded-xl p-6 flex flex-col items-center text-center hover:border-maroon hover:shadow-md transition-all cursor-pointer"
            >
              <span className="text-4xl mb-3">{cat.emoji}</span>
              <span className="font-semibold text-gray-900 group-hover:text-maroon transition-colors">{cat.label}</span>
              <span className="text-sm text-shadow-gray mt-1">{cat.desc}</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}
