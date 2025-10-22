// apps/client/src/components/client/articles/ArticleModal.jsx
'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  ScrollArea,
  Badge,
} from '@/components/shared'
import { FileText, Users, Mail, Briefcase, Building, ExternalLink } from 'lucide-react'
import { getCountryFlag } from '@headlines/utils-shared'

function ArticleDetail({ article }) {
  if (!article) return null

  // BACKWARD COMPATIBILITY FIX: Ensure 'country' is always treated as an array.
  const countryArray = Array.isArray(article.country)
    ? article.country
    : [article.country].filter(Boolean)
  const flags = countryArray.map(getCountryFlag).join(' ')

  const score = article.relevance_article || article.relevance_headline || 0

  const getRelevanceBadgeClass = (score) => {
    if (score >= 90) return 'bg-red-500/20 text-red-300 border border-red-500/30'
    if (score >= 75) return 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
    return 'bg-slate-500/20 text-slate-300 border border-slate-500/30'
  }

  return (
    <div className="p-4 border-b border-slate-700 last:border-b-0 space-y-4">
      {/* Header */}
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 space-y-2">
          <h3 className="font-serif font-bold text-lg text-slate-100 leading-tight">
            {flags && <span className="text-xl mr-2 align-middle">{flags}</span>}
            {article.headline_en || article.headline}
          </h3>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{article.newspaper}</Badge>
            <a
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:underline flex items-center gap-1"
            >
              View Original <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
        <Badge
          className={`text-base font-bold px-3 py-1 ${getRelevanceBadgeClass(score)}`}
        >
          {score}
        </Badge>
      </div>

      {/* AI Assessment */}
      {article.assessment_article && (
        <div className="p-3 bg-slate-800/30 rounded-md">
          <h4 className="font-semibold text-sm text-slate-400 mb-1">
            Intelligence Analysis
          </h4>
          <p className="text-sm text-slate-300 italic">"{article.assessment_article}"</p>
        </div>
      )}

      {/* Key Individuals */}
      {article.key_individuals && article.key_individuals.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold text-sm text-slate-400">Key Individuals</h4>
          {article.key_individuals.map((person, index) => (
            <div key={index} className="p-2 rounded-md bg-slate-800/50 text-sm">
              <p className="font-semibold text-slate-200 flex items-center gap-2">
                <Users className="h-4 w-4 text-slate-500" /> {person.name}
              </p>
              <div className="pl-6 space-y-1 mt-1 text-slate-400">
                {person.role_in_event && (
                  <p className="flex items-center gap-2 text-xs">
                    <Briefcase className="h-3 w-3" /> {person.role_in_event}
                  </p>
                )}
                {person.company && (
                  <p className="flex items-center gap-2 text-xs">
                    <Building className="h-3 w-3" /> {person.company}
                  </p>
                )}
                {person.email_suggestion && (
                  <a
                    href={`mailto:${person.email_suggestion}`}
                    className="flex items-center gap-2 text-xs text-blue-400 hover:underline"
                  >
                    <Mail className="h-3 w-3" /> {person.email_suggestion}
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function ArticleModal({ articles = [], open, onOpenChange }) {
  const articleCount = articles.length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl w-[95vw] h-[80vh] flex flex-col bg-slate-900 border-slate-700">
        <DialogHeader className="p-6 border-b border-slate-700">
          <DialogTitle className="text-2xl text-slate-100 flex items-center gap-2">
            <FileText className="h-6 w-6 text-slate-400" />
            Raw Articles
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {articleCount > 0
              ? `Displaying ${articleCount} article${articleCount > 1 ? 's' : ''} matching the criteria.`
              : 'No articles found.'}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow min-h-0">
          <ScrollArea className="h-full">
            {articleCount > 0 ? (
              articles.map((article) => (
                <ArticleDetail key={article._id} article={article} />
              ))
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500">
                <p>No articles to display.</p>
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}
