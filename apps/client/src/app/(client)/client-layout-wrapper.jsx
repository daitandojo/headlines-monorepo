// apps/client/src/app/(client)/client-layout-wrapper.jsx
'use client'

import { Header } from '@/components/client/shared/Header'
import { MainNavTabs } from '@/components/client/shared/MainNavTabs'

export function ClientLayoutWrapper({ children, serverProps }) {
  return (
    <div className="container mx-auto p-4 md:p-8 flex flex-col min-h-screen">
      {/* The count props are no longer passed, as the Header gets them from the Zustand store */}
      <Header {...serverProps} />
      <div className="sticky top-[5px] z-30 my-4">
        <MainNavTabs />
      </div>
      <main className="flex-grow flex flex-col mt-0 min-h-0">{children}</main>
    </div>
  )
}
