// headlines/client/src/components/landing/LandingPage.jsx
import { getPublicTickerEvents } from '@headlines/data-access/next'
import { Hero } from './Hero'
import { InteractiveDemo } from './InteractiveDemo'
import { Features } from './Features'
import { GlobalCoverage } from './GlobalCoverage'
import { SignUpFlow } from './SignUpFlow'
import { AboutSection } from './AboutSection'
import { StatsSection } from './StatsSection'
import { Footer } from './Footer'

export const dynamic = 'force-dynamic'

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