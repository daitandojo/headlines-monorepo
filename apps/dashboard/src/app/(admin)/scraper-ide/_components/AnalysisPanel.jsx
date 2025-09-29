// apps/admin/src/app/(protected)/scraper-ide/_components/AnalysisPanel.jsx (version 3.0.0)
'use client'

import { useState } from 'react'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@components/shared'
import { Link as LinkIcon, CheckCircle2 } from 'lucide-react'
import { cn } from '@headlines/utils-shared'

export default function AnalysisPanel({
  analysis,
  onSetSelector,
  onDrillDown,
  activeHeadlineSelector,
}) {
  const [openAccordion, setOpenAccordion] = useState(null)

  if (!analysis) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p>Analyze a URL to see link structure suggestions here.</p>
      </div>
    )
  }

  if (analysis.suggestions.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p>No suitable link clusters found on this page.</p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      <Card className="bg-transparent border-none shadow-none">
        <CardHeader>
          <CardTitle>Heuristic Link Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion
            type="single"
            collapsible
            className="w-full"
            value={openAccordion}
            onValueChange={setOpenAccordion}
          >
            {analysis.suggestions.map((cluster, index) => {
              const isActive = activeHeadlineSelector === cluster.selector
              return (
                <AccordionItem value={`item-${index}`} key={index}>
                  <AccordionTrigger
                    className={cn(
                      'font-mono text-sm px-2 rounded hover:bg-white/5',
                      isActive && 'bg-primary/10'
                    )}
                  >
                    <div className="flex justify-between w-full items-center pr-2">
                      <div className="flex items-center gap-2 truncate">
                        {isActive && (
                          <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0" />
                        )}
                        <span className="truncate">{cluster.selector}</span>
                      </div>
                      <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-md">
                        {cluster.count} links
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="p-2">
                    <div className="bg-background/50 p-4 rounded-md border border-border">
                      <div className="flex justify-end gap-2 mb-3">
                        <Button size="sm" onClick={() => onSetSelector(cluster.selector)}>
                          Set as Headline Selector
                        </Button>
                      </div>
                      <ul className="space-y-1 max-h-48 overflow-y-auto pr-2">
                        {cluster.samples.map((sample, s_index) => (
                          <li
                            key={s_index}
                            className="text-xs p-1.5 rounded bg-background flex items-center gap-2 cursor-pointer hover:bg-accent"
                            onClick={() => onDrillDown(sample.href)}
                          >
                            <LinkIcon className="h-3 w-3 flex-shrink-0" />
                            <div className="truncate">
                              <p className="text-muted-foreground truncate font-medium">
                                {sample.text}
                              </p>
                              <p className="text-blue-400 text-[10px] truncate">
                                {sample.href}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )
            })}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  )
}
