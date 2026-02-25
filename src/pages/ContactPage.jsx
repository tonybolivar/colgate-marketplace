export default function ContactPage() {
  return (
    <div className="max-w-xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Contact Us</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8">
        Have a question, issue, or feedback? We'd love to hear from you.
      </p>

      <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-6 bg-white dark:bg-gray-900 shadow-sm space-y-4">
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</p>
          <a
            href="mailto:colgatemarketplace13@gmail.com"
            className="text-maroon hover:underline font-medium"
          >
            colgatemarketplace13@gmail.com
          </a>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Response time</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">We typically respond within 1–2 business days.</p>
        </div>

        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          <a
            href="mailto:colgatemarketplace13@gmail.com"
            className="inline-block bg-maroon hover:bg-maroon-light text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
          >
            Send us an email
          </a>
        </div>
      </div>
    </div>
  )
}
