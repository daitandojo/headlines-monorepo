// apps/client/src/components/landing/LandingPage.jsx
import { getPublicTickerEvents } from '@headlines/data-access/next'
import { Hero } from '@/app/(public)/_components/Hero'
import { InteractiveDemo } from '@/app/(public)/_components/InteractiveDemo'
import { Features } from '@/app/(public)/_components/Features'
import { GlobalCoverage } from '@/app/(public)/_components/GlobalCoverage'
import { SignUpFlow } from '@/app/(public)/_components/SignUpFlow'
import { AboutSection } from '@/app/(public)/_components/AboutSection'
import { StatsSection } from '@/app/(public)/_components/StatsSection'
import { Footer } from '@/app/(public)/_components/Footer'

export const dynamic = 'force-dynamic'

// Note: The dbConnect() call has been removed as it's handled by getPublicTickerEvents
export default async function LandingPage() {
  const tickerResult = await getPublicTickerEvents()
  const tickerEvents = tickerResult.success ? tickerResult.data : []

  return (
    <main className="flex flex-col items-center">
      <Hero tickerEvents={tickerEvents} />
      <div className="w-full container mx-auto px-4 sm:px-6 lg:px-8 mt-24 sm:mt-32 space-y-24 sm:space-y-32">
        <StatsSection />
        <InteractiveDemo />
        <Features />
        <AboutSection />
        <GlobalCoverage />
        <SignUpFlow />
      </div>
      <Footer />
    </main>
  )
}
