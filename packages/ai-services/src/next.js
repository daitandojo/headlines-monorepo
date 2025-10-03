// packages/ai-services/src/next.js
import 'server-only'

// By marking this entire entry point as 'server-only', we tell the Next.js bundler
// that none of this code should ever be included in a client-side bundle. This
// correctly isolates the native dependencies and resolves the build error.

export * from './chains/index.js'
export * from './search/search.js'
export * from './search/wikipedia.js'
export * from './embeddings/embeddings.js'
export * from './embeddings/vectorSearch.js'
export * from './rag/orchestrator.js'
export * from './shared/agents/synthesisAgent.js'
export * from './shared/agents/opportunityAgent.js'
export * from './shared/agents/contactAgent.js'
export * from './shared/agents/entityAgent.js'
export * from './shared/agents/emailAgents.js'
export * from './shared/agents/executiveSummaryAgent.js'

// Re-export the sanity check function
import { performAiSanityCheck as coreSanityCheck } from './index.js'
export const performAiSanityCheck = coreSanityCheck
