// src/app/_components/suggestion-accordion.jsx (version 1.3)
'use client'

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger, Button } from '@headlines/ui/src/index.js'
import { ExternalLink, Wand2 } from 'lucide-react'
import { motion } from 'framer-motion'

export default function SuggestionAccordion({ suggestions, onApply }) {
  if (!suggestions || suggestions.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-10">
        <Wand2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No valid suggestions found.</p>
        <p className="text-xs">The AI or test run returned no results.</p>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Accordion type="single" collapsible className="w-full">
        {suggestions.map((item, index) => (
          <AccordionItem value={`item-${index}`} key={index}>
            <AccordionTrigger className="font-mono text-sm px-2 hover:bg-white/5 rounded">
              <div className="flex justify-between w-full items-center pr-2">
                <span className="truncate">{item.selector}</span>
                <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-md">
                  {item.count} hits
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="p-2">
              <div className="bg-background/50 p-4 rounded-md border border-border">
                {item.selector !== 'Test Results' && (
                  <div className="flex justify-end mb-3">
                    <Button size="sm" onClick={() => onApply(item.selector)}>
                      Apply this Selector
                    </Button>
                  </div>
                )}
                <ul className="space-y-3 max-h-60 overflow-y-auto pr-2">
                  {item.samples && item.samples.length > 0 ? (
                    item.samples.map((sample, s_index) => (
                      <li
                        key={s_index}
                        className="text-sm border-b border-border/50 pb-2"
                      >
                        <p className="font-medium">{sample.headline}</p>
                        <a
                          href={sample.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 truncate"
                        >
                          <ExternalLink className="w-3 h-3 flex-shrink-0" />
                          {sample.link}
                        </a>
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-muted-foreground">No samples found.</li>
                  )}
                </ul>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </motion.div>
  )
}
