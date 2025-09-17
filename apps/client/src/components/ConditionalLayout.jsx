// src/components/ConditionalLayout.jsx (version 1.1)
'use client'

import { usePathname } from 'next/navigation'
import { Header } from '@/components/Header'
import { MainNavTabs } from '@/components/MainNavTabs'

/**
 * This component now acts as the primary layout renderer on the client side.
 * It uses the pathname to decide whether to render the full application shell
 * (for most pages) or a stripped-down layout for special cases like the chat page.
 */
export function ConditionalLayout({ children, serverProps }) {
  const pathname = usePathname()
  const isChatPage = pathname === '/chat'

  // The chat page gets a unique, full-height layout.
  if (isChatPage) {
    return (
      <div className="h-dvh flex flex-col">
        <div className="container mx-auto p-4 md:p-8 flex flex-col flex-grow min-h-0">
          <Header {...serverProps} />
          <div className="sticky top-[5px] z-30 my-4">
            <MainNavTabs />
          </div>
          <main className="flex-grow flex flex-col mt-0 min-h-0">{children}</main>
        </div>
      </div>
    )
  }

  // All other pages get the standard layout with scrolling content.
  return (
    <div className="container mx-auto p-4 md:p-8 flex flex-col min-h-screen">
      <Header {...serverProps} />
      <div className="sticky top-[5px] z-30 my-4">
        <MainNavTabs />
      </div>
      <main className="flex-grow flex flex-col">{children}</main>
    </div>
  )
}
