import Navbar from '@/components/Navbar'
import Hero from '@/components/Hero'
import Categories from '@/components/Categories'
import HowItWorks from '@/components/HowItWorks'
import Footer from '@/components/Footer'

function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <Categories />
        <HowItWorks />
      </main>
      <Footer />
    </div>
  )
}

export default App
