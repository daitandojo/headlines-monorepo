// apps/client/src/app/(public)/page.jsx
import { getPublicTickerEvents } from '@headlines/data-access/next'
import { Hero } from './_components/Hero'
import { InteractiveDemo } from './_components/InteractiveDemo'
import { Features } from './_components/Features'
import { GlobalCoverage } from './_components/GlobalCoverage'
import { SignUpFlow } from './_components/SignUpFlow'
import { AboutSection } from './_components/AboutSection'
import { StatsSection } from './_components/StatsSection'
import { Footer } from './_components/Footer'
import dbConnect from '@headlines/data-access/dbConnect/next'

export const dynamic = 'force-dynamic'

export default async function LandingPage() {
  await dbConnect()
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
