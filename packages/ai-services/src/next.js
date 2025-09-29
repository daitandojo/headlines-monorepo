import 'server-only'

// Explicitly re-export all functions and services from the core module
// for the Next.js server runtime.
export {
  // Foundational exports
  performAiSanityCheck,
  processChatRequest,
  callLanguageModel,

  // Low-level chains
  articleChain,
  articlePreAssessmentChain,
  clusteringChain,
  contactFinderChain,
  contactResolverChain,
  disambiguationChain,
  emailIntroChain,
  emailSubjectChain,
  entityCanonicalizerChain,
  entityExtractorChain,
  executiveSummaryChain,
  headlineChain,
  batchHeadlineChain,
  judgeChain,
  opportunityChain,
  sectionClassifierChain,
  selectorRepairChain,
  synthesisChain,
  watchlistSuggestionChain,
  translateChain,
  countryCorrectionChain,

  // External search and data retrieval services
  findAlternativeSources,
  performGoogleSearch,
  findNewsApiArticlesForEvent,
  fetchWikipediaSummary,

  // Vector embedding and search services
  generateEmbedding,
  findSimilarArticles,

  // High-level agent functions
  assessArticleContent,
  preAssessArticle,
  batchAssessArticles,
  clusterArticlesIntoEvents,
  resolveVagueContact,
  findContactDetails,
  generateEmailSubjectLine,
  generatePersonalizedIntro,
  extractEntities,
  entityCanonicalizerAgent,
  assessHeadlinesInBatches,
  judgePipelineOutput,
  generateOpportunitiesFromEvent,
  sectionClassifierAgent,
  suggestNewSelector,
  synthesizeEvent,
  synthesizeFromHeadline,
  generateWatchlistSuggestions,
  generateExecutiveSummary,
} from './core.js'
