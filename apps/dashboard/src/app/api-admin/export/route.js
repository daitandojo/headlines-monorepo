// apps/admin/src/app/api/export/route.js (NEW FILE)
import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/api-handler'
import { generateExport } from '@headlines/data-access'
import { Opportunity, Subscriber, SynthesizedEvent, Article } from '@headlines/models'

const entityConfig = {
  opportunities: {
    model: Opportunity,
    columns: [
      { header: 'Country', key: 'basedIn' },
      { header: 'City', key: 'city' },
      { header: 'Contact', key: 'reachOutTo' },
      { header: 'Wealth ($M)', key: 'likelyMMDollarWealth' },
      { header: 'Email', key: 'contactDetails.email' },
      { header: 'Reason', key: 'whyContact' },
      { header: 'Created', key: 'createdAt' },
    ],
  },
  users: {
    model: Subscriber,
    columns: [
      { header: 'Email', key: 'email' },
      { header: 'FirstName', key: 'firstName' },
      { header: 'LastName', key: 'lastName' },
      { header: 'IsActive', key: 'isActive' },
      { header: 'Role', key: 'role' },
      { header: 'Tier', key: 'subscriptionTier' },
      { header: 'Created', key: 'createdAt' },
    ],
  },
  events: {
    model: SynthesizedEvent,
    columns: [
      { header: 'Headline', key: 'synthesized_headline' },
      { header: 'Summary', key: 'synthesized_summary' },
      { header: 'Score', key: 'highest_relevance_score' },
      { header: 'Country', key: 'country' },
      { header: 'Created', key: 'createdAt' },
    ],
  },
  articles: {
    model: Article,
    columns: [
      { header: 'Headline', key: 'headline' },
      { header: 'Newspaper', key: 'newspaper' },
      { header: 'Country', key: 'country' },
      { header: 'Headline Score', key: 'relevance_headline' },
      { header: 'Article Score', key: 'relevance_article' },
      { header: 'Link', key: 'link' },
      { header: 'Created', key: 'createdAt' },
    ],
  },
}

const handlePost = async (request) => {
  const { entity, fileType, filters, sort } = await request.json()

  const config = entityConfig[entity]
  if (!config) {
    return NextResponse.json(
      { error: 'Invalid entity type for export.' },
      { status: 400 }
    )
  }

  const result = await generateExport({
    model: config.model,
    columns: config.columns,
    filters,
    sort,
    fileType,
  })

  if (!result.success) {
    throw new Error(result.error)
  }

  return new Response(result.data, {
    headers: {
      'Content-Type': result.contentType,
      'Content-Disposition': `attachment; filename="export_${entity}_${new Date().toISOString()}.${result.extension}"`,
    },
  })
}

export const POST = createApiHandler(handlePost)
