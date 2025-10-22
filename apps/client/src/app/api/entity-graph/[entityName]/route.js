// apps/client/src/app/api/entity-graph/[entityName]/route.js
import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/api-handler'
import { EntityGraph } from '@headlines/models/next'

const handleGet = async (request, { params }) => {
  // The entity name will be URL-encoded, so we need to decode it.
  const entityName = decodeURIComponent(params.entityName)

  if (!entityName) {
    return NextResponse.json({ error: 'Entity name is required.' }, { status: 400 })
  }

  // Find the entity by its canonical name. We can expand this to search aliases in the future.
  const entity = await EntityGraph.findOne({ name: entityName }).lean()

  if (!entity) {
    // It's not an "error" if an entity isn't in the graph yet, just return not found.
    return NextResponse.json(
      { error: 'Entity not found in the knowledge graph.' },
      { status: 404 }
    )
  }

  return NextResponse.json({ success: true, data: entity })
}

export const GET = createApiHandler(handleGet)
export const dynamic = 'force-dynamic'
