// apps/client/src/app/(protected)/AppShell.jsx (NEW FILE)
'use client'

import { Providers } from '@/app/providers'
import { Header } from '@/components/Header'
import { MainNavTabs } from '@/components/MainNavTabs'
import { usePathname } from 'next/navigation'

export function AppShell({ children, serverProps }) {
  const pathname = usePathname()
  const isChatPage = pathname === '/chat'

  const content = (
    <>
      <Header {...serverProps} />
      <div className="sticky top-[5px] z-30 my-4">
        <MainNavTabs />
      </div>
      <main className="flex-grow flex flex-col mt-0 min-h-0">{children}</main>
    </>
  )

  return (
    <Providers>
      {isChatPage ? (
        <div className="h-dvh flex flex-col">
          <div className="container mx-auto p-4 md:p-8 flex flex-col flex-grow min-h-0">
            {content}
          </div>
        </div>
      ) : (
        <div className="container mx-auto p-4 md:p-8 flex flex-col min-h-screen">
          {content}
        </div>
      )}
    </Providers>
  )
}
