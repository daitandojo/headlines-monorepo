// apps/admin/src/app/(protected)/scraper-ide/_components/TabsBar.jsx (version 2.0.0)
'use client'

import { cn } from '@headlines/utils-shared'
import { LayoutList, FileText, X, RefreshCw, Wand2 } from 'lucide-react'
import { Button } from '@components/shared'

export default function TabsBar({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onAnalyze,
  isAnalyzing,
}) {
  if (!tabs || tabs.length === 0) {
    return (
      <div className="flex-shrink-0 border-b bg-secondary/30 p-2 text-center text-sm text-muted-foreground h-[49px] flex items-center justify-center">
        Select a source or click "Add New Source" to begin.
      </div>
    )
  }

  const activeTab = tabs.find((t) => t.id === activeTabId)

  return (
    <div className="flex-shrink-0 border-b bg-secondary/30 flex justify-between items-center pr-2">
      <ul className="flex items-center gap-1 p-1">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId
          const Icon = tab.type === 'discovery' ? LayoutList : FileText
          return (
            <li
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={cn(
                'flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-t-md cursor-pointer border-b-2',
                isActive
                  ? 'bg-background border-primary text-primary'
                  : 'bg-secondary border-transparent hover:bg-accent'
              )}
            >
              <Icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm truncate max-w-48">
                {tab.url.replace(/^https?:\/\//, '')}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onCloseTab(tab.id)
                }}
                className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          )
        })}
      </ul>
      {activeTab?.type === 'discovery' && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onAnalyze(activeTab.url)}
          disabled={isAnalyzing}
        >
          {isAnalyzing ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Wand2 className="h-4 w-4 mr-2" />
          )}
          Analyze Page
        </Button>
      )}
    </div>
  )
}
