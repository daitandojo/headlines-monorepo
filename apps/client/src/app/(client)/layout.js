// apps/client/src/app/(client)/layout.js
import { Header } from '@/components/client/shared/Header'
import { MainNavTabs } from '@/components/client/shared/MainNavTabs'
import { Breadcrumbs } from '@/components/client/shared/Breadcrumbs'

export default function ClientLayout({ children }) {
  return (
    <div className="container mx-auto p-4 md:p-8 flex flex-col min-h-screen">
      <Header />
      <div className="sticky top-[5px] z-30 my-4">
        <MainNavTabs />
      </div>
      <main className="flex-grow flex flex-col mt-0 min-h-0">
        <Breadcrumbs />
        {children}
      </main>
    </div>
  )
}
