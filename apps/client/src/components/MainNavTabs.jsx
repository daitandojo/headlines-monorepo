// src/components/MainNavTabs.jsx (version 2.0)
'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Zap, Newspaper, UploadCloud, MessageSquare, Target, ArrowUp } from 'lucide-react'

const TABS = [
  { value: 'events', label: 'Events', icon: Zap },
  { value: 'articles', label: 'Articles', icon: Newspaper },
  { value: 'opportunities', label: 'Opportunities', icon: Target },
  { value: 'upload', label: 'Upload', icon: UploadCloud },
  { value: 'chat', label: 'Chat', icon: MessageSquare },
]

export function MainNavTabs() {
  const pathname = usePathname()
  const currentView = pathname.substring(1).split('/')[0] || 'events'
  const [showScrollButton, setShowScrollButton] = useState(false)

  useEffect(() => {
    const checkScrollTop = () => {
      // Show button if user has scrolled down more than 400px
      if (window.scrollY > 400) {
        setShowScrollButton(true)
      } else {
        setShowScrollButton(false)
      }
    }

    window.addEventListener('scroll', checkScrollTop)
    return () => {
      window.removeEventListener('scroll', checkScrollTop)
    }
  }, [])

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  return (
    <Tabs value={currentView} className="w-full">
      <div className="flex justify-center">
        <TabsList className="h-12 rounded-full bg-slate-900/60 backdrop-blur-sm border border-slate-700/80 p-2 shadow-lg transition-all duration-300">
          {TABS.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              asChild
              className="px-3 sm:px-6 rounded-full data-[state=active]:bg-blue-600/80 data-[state=active]:text-white"
            >
              <Link href={`/${tab.value}`} className="flex items-center gap-2">
                <tab.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </Link>
            </TabsTrigger>
          ))}
          <AnimatePresence>
            {showScrollButton && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="overflow-hidden flex items-center"
              >
                <div className="h-6 w-px bg-slate-700/60 mx-2" />
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full h-9 w-9 text-slate-400 hover:text-white hover:bg-slate-700/50"
                  onClick={scrollToTop}
                  aria-label="Scroll to top"
                >
                  <ArrowUp className="h-5 w-5" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </TabsList>
      </div>
    </Tabs>
  )
}
