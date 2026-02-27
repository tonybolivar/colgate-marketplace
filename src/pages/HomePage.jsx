import Hero from '@/components/Hero'
import Categories from '@/components/Categories'
import HowItWorks from '@/components/HowItWorks'
import RecentlyViewed from '@/components/RecentlyViewed'

export default function HomePage() {
  return (
    <>
      <Hero />
      <RecentlyViewed />
      <Categories />
      <HowItWorks />
    </>
  )
}
