export default function PrivacyPage() {
  return (
    <div className="max-w-xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
      <p className="text-gray-500 mb-8">Last updated: February 2026</p>

      <div className="border rounded-xl p-6 bg-white shadow-sm space-y-5 text-sm text-gray-700 leading-relaxed">
        <p>
          This privacy policy is a placeholder. A full policy will be published before the public launch of Colgate Marketplace.
        </p>
        <p>
          In the meantime, here is what you should know:
        </p>
        <ul className="list-disc list-inside space-y-2 text-gray-600">
          <li>We collect your name and @colgate.edu email address when you register.</li>
          <li>Your information is only accessible to other verified Colgate community members.</li>
          <li>We do not sell your data to third parties.</li>
          <li>Listing content and messages are stored securely via Supabase.</li>
        </ul>
        <p>
          Questions? Reach us at{' '}
          <a href="mailto:colgatemarketplace@gmail.com" className="text-maroon hover:underline">
            colgatemarketplace@gmail.com
          </a>.
        </p>
      </div>
    </div>
  )
}
