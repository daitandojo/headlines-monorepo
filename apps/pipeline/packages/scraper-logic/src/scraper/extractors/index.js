// packages/scraper-logic/src/scraper/extractors/index.js (version 2.0.0)
// This file uses static imports to be compatible with both Node.js (pipeline) and Webpack (Next.js apps).

// Reusable Extractors
import { simpleExtractor } from './reusable/simple.js';

// Source-Specific Headline Extractors
import { cvcPortfolioExtractor } from './source-specific/cvcPortfolio.js';
import { finansDkExtractor } from './source-specific/finansDk.js';
import { jyllandsPostenExtractor } from './source-specific/jyllandsPosten.js';
import { okonomiskUgebrevExtractor } from './source-specific/okonomiskUgebrev.js';
import { politikenExtractor } from './source-specific/politiken.js';
import { verdaneExtractor } from './source-specific/verdane.js';

// Source-Specific Content Extractors
import { cvcPortfolioContentExtractor } from './source-specific/cvcPortfolioContent.js';

// --- Build Registries ---

export const extractorRegistry = {
  // Reusable
  simple: simpleExtractor,

  // Source-specific
  cvc_portfolio: cvcPortfolioExtractor,
  finans_dk: finansDkExtractor,
  jyllands_posten: jyllandsPostenExtractor,
  okonomisk_ugebrev: okonomiskUgebrevExtractor,
  politiken: politikenExtractor,
  verdane: verdaneExtractor,

  // Manual mapping for legacy keys
  gro_capital: simpleExtractor,
  eifo_dk: simpleExtractor,
  clearwater_dk: simpleExtractor,
  e24: simpleExtractor,
  quotenet_nl: simpleExtractor,
};

export const contentExtractorRegistry = {
  cvc_portfolio_content: cvcPortfolioContentExtractor,
};

console.log(`[Extractor Registry] Statically loaded ${Object.keys(extractorRegistry).length} headline extractors and ${Object.keys(contentExtractorRegistry).length} content extractors.`);
