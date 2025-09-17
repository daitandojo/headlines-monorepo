// src/components/events/EventCardDetails.jsx (version 1.0)
'use client'

import { Users, Mail, Building, Briefcase } from 'lucide-react'

export function EventCardDetails({ event }) {
  if (!event) return null

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Key Individuals Column */}
      {event.key_individuals && event.key_individuals.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-semibold text-sm text-slate-300 mb-2 border-b border-slate-700 pb-1">
            Key Individuals
          </h4>
          {event.key_individuals.map((person, index) => (
            <div key={index} className="p-3 rounded-md bg-slate-800/50">
              <p className="font-bold text-slate-100 flex items-center gap-2">
                <Users className="h-4 w-4 text-slate-400" /> {person.name}
              </p>
              <div className="pl-6 space-y-1 mt-1 text-sm text-slate-400">
                {person.role_in_event && (
                  <p className="flex items-center gap-2">
                    <Briefcase className="h-3 w-3" /> {person.role_in_event}
                  </p>
                )}
                {person.company && (
                  <p className="flex items-center gap-2">
                    <Building className="h-3 w-3" /> {person.company}
                  </p>
                )}
                {person.email_suggestion && (
                  <a
                    href={`mailto:${person.email_suggestion}`}
                    className="flex items-center gap-2 text-blue-400 hover:underline"
                  >
                    <Mail className="h-3 w-3" /> {person.email_suggestion}
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Source Articles Column */}
      <div className="space-y-2">
        <h4 className="font-semibold text-sm text-slate-300 mb-2 border-b border-slate-700 pb-1">
          Source Articles ({event.source_articles.length})
        </h4>
        {event.source_articles.map((article) => (
          <a
            key={article.link}
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-3 rounded-md bg-slate-800/50 hover:bg-slate-800/80 transition-colors"
          >
            <p className="font-medium text-slate-200 line-clamp-1 text-sm">
              {article.headline}
            </p>
            <p className="text-xs text-slate-400">{article.newspaper}</p>
          </a>
        ))}
      </div>
    </div>
  )
}
