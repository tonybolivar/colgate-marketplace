export default function AboutPage() {
  return (
    <div className="max-w-xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">About</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8">The people behind Colgate Marketplace.</p>

      <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-6 bg-white dark:bg-gray-900 shadow-sm space-y-5">
        <p className="text-gray-700 dark:text-gray-300">
          The Colgate Marketplace was founded by Anthony Bolivar and Thomas Sfikas, students at Colgate University.
        </p>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-5 space-y-3">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Anthony Bolivar</p>
            <a
              href="https://www.anthonybolivar.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-maroon hover:underline"
            >
              anthonybolivar.com
            </a>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Thomas Sfikas</p>
            <a
              href="https://www.linkedin.com/in/thomas-sfikas-4014b6246"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-maroon hover:underline"
            >
              linkedin.com/in/thomas-sfikas-4014b6246
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
