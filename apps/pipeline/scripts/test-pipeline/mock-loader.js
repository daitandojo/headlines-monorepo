// apps/pipeline/scripts/test-pipeline/mock-loader.js
import { logger } from '@headlines/utils-shared'

const MOCK_MODULE_ID = '@headlines/ai-services'
const MOCK_MODULE_URL = new URL(MOCK_MODULE_ID, import.meta.url).href

const mockImplementation = `
import { logger } from '@headlines/utils-shared';

logger.info('[MOCK LOADER] The @headlines/ai-services module has been fully mocked.');

export const dossierUpdateChain = async ({ existing_dossier_json }) => {
  const existing = JSON.parse(existing_dossier_json);
  logger.info(\`[MOCK] dossierUpdateChain called for: \${existing.reachOutTo}\`);
  // --- START OF DEFINITIVE FIX ---
  // Defensively create the profile object if it doesn't exist
  if (!existing.profile) {
    existing.profile = {};
  }
  // --- END OF DEFINITIVE FIX ---
  existing.profile.biography = (existing.profile.biography || '') + ' [Updated by mock]';
  return { opportunities: [existing] };
};

export const opportunityChain = async ({ context_text }) => {
  const nameMatch = context_text.match(/Synthesized Event Headline:.*?([A-Z][a-z]+(?: [A-Z][a-z]+)+)/);
  const name = nameMatch ? nameMatch[1] : 'Mocked New Individual';
  logger.info(\`[MOCK] opportunityChain called for: \${name}\`);
  return {
    opportunities: [{
      reachOutTo: name,
      contactDetails: { role: 'Mock Role', company: 'Mock Company' },
      lastKnownEventLiquidityMM: 50,
      whyContact: ['Generated from a mock AI call.'],
      profile: { dossierQuality: 'bronze', biography: 'Mock biography.' }
    }]
  };
};

export const entityCanonicalizerChain = async ({ entity_name }) => ({ canonical_name: entity_name });
export const contactFinderChain = async () => ({ email: 'mock.contact@email.com' });
export const generateEmbedding = async () => Array(384).fill(0.1);
export const performGoogleSearch = async () => ({ success: true, snippets: 'Mock snippets' });
export const fetchWikipediaSummary = async () => ({ success: true, summary: 'Mock summary' });

// Export any other functions that might be called to prevent 'not a function' errors
export const clusteringChain = async () => ({ events: [] });
export const headlineChain = async () => ({});
// ... add other exports from ai-services as needed, pointing to dummy functions
`

export function resolve(specifier, context, nextResolve) {
  if (specifier === MOCK_MODULE_ID) {
    return {
      url: MOCK_MODULE_URL,
      shortCircuit: true,
    }
  }
  return nextResolve(specifier, context)
}

export function load(url, context, nextLoad) {
  if (url === MOCK_MODULE_URL) {
    return {
      format: 'module',
      source: mockImplementation,
      shortCircuit: true,
    }
  }
  return nextLoad(url, context)
}
