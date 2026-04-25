'use client'

import { useState } from 'react'
import { getCountryFlag } from '@headlines/utils-shared'

export function DealFlowVisualizer({ events }) {
  const [view, setView] = useState('timeline')
  
  if (!events || events.length === 0) {
    return <div className="p-4 text-gray-500">No events to visualize</div>
  }
  
  const sectorBreakdown = () => {
    const sectors = {}
    events.forEach(e => {
      const sector = e.eventClassification || 'Other'
      sectors[sector] = (sectors[sector] || 0) + 1
    })
    const sorted = Object.entries(sectors).sort((a, b) => b[1] - a[1])
    const total = events.length
    
    return (
      <div className="space-y-3">
        {sorted.map(([sector, count]) => (
          <div key={sector} className="flex items-center gap-3">
            <div className="w-24 text-sm text-gray-400">{sector}</div>
            <div className="flex-1 h-6 bg-gray-800 rounded overflow-hidden">
              <div 
                className="h-full bg-amber-600 flex items-center justify-end pr-2"
                style={{ width: `${(count / total) * 100}%` }}
              >
                <span className="text-xs font-medium">{count}</span>
              </div>
            </div>
            <div className="w-12 text-right text-sm text-gray-500">{((count / total) * 100).toFixed(0)}%</div>
          </div>
        ))}
      </div>
    )
  }
  
  const geographyView = () => {
    const countries = {}
    events.forEach(e => {
      if (e.primaryCountry) {
        countries[e.primaryCountry] = (countries[e.primaryCountry] || 0) + 1
      }
    })
    const sorted = Object.entries(countries).sort((a, b) => b[1] - a[1])
    
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {sorted.slice(0, 12).map(([country, count]) => (
          <div key={country} className="flex items-center gap-2 p-3 bg-gray-800 rounded-lg">
            <span className="text-xl">{getCountryFlag(country)}</span>
            <div>
              <div className="font-medium text-sm">{country}</div>
              <div className="text-xs text-gray-500">{count} events</div>
            </div>
          </div>
        ))}
      </div>
    )
  }
  
  const timelineView = () => {
    const sorted = [...events].sort((a, b) => 
      new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    )
    
    return (
      <div className="space-y-2">
        {sorted.slice(0, 20).map((event, idx) => (
          <div key={event._id} className="flex gap-3">
            <div className="w-20 text-xs text-gray-500 text-right pt-1">
              {new Date(event.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
            <div className="w-2 h-2 mt-2 rounded-full bg-amber-500"></div>
            <div className="flex-1 pb-3 border-b border-gray-800">
              <div className="text-sm font-medium truncate">{event.synthesized_headline}</div>
              <div className="text-xs text-gray-500">{event.primaryCountry} · {event.eventClassification}</div>
            </div>
          </div>
        ))}
      </div>
    )
  }
  
  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800">
      <div className="flex border-b border-gray-800">
        {['timeline', 'sectors', 'geography'].map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-4 py-2 text-sm font-medium capitalize ${view === v ? 'text-amber-500 border-b-2 border-amber-500' : 'text-gray-400 hover:text-gray-300'}`}
          >
            {v}
          </button>
        ))}
      </div>
      <div className="p-4">
        {view === 'timeline' && timelineView()}
        {view === 'sectors' && sectorBreakdown()}
        {view === 'geography' && geographyView()}
      </div>
    </div>
  )
}