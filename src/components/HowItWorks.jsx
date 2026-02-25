const steps = [
  {
    number: '01',
    title: 'Create an account',
    desc: "Sign up with your @colgate.edu email to verify you're part of the community.",
  },
  {
    number: '02',
    title: 'Post a listing',
    desc: 'Add photos, a description, and your asking price in under two minutes.',
  },
  {
    number: '03',
    title: 'Meet on campus',
    desc: 'Connect with buyers or sellers and exchange safely on campus.',
  },
]

export default function HowItWorks() {
  return (
    <section className="bg-gray-50 dark:bg-gray-800 py-16">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-2xl font-bold text-maroon mb-2 text-center">How It Works</h2>
        <p className="text-center text-shadow-gray dark:text-gray-400 mb-12">Simple, safe, and built for Colgate</p>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step) => (
            <div key={step.number} className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-maroon text-white flex items-center justify-center text-lg font-bold mb-4">
                {step.number}
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg mb-2">{step.title}</h3>
              <p className="text-shadow-gray dark:text-gray-400 text-sm leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
