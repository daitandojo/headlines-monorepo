// apps/pipeline/scripts/test-pipeline/stage4_output.js

// This file contains a high-fidelity mock snapshot of the pipeline payload as it would
// exist after Stage 4 and before Stage 5.

export const mockSynthesizedEvents = [
  {
    _id: '68eed225f95b439a159ff669',
    event_key: 'sale-erik-damgaard-uniconta-2025-10-14',
    synthesized_headline:
      'Erik Damgaard sells majority stake in Uniconta for undisclosed multi‑billion DKK sum',
    synthesized_summary:
      'Danish software entrepreneur Erik Damgaard has sold a majority stake in his cloud ERP company Uniconta...',
    highest_relevance_score: 95,
    // --- START OF FIX: Add the missing source_articles array ---
    source_articles: [
      {
        link: 'https://borsen.dk/nyheder/virksomheder/erik-damgaard-rejser-sig-saelger-firma-for-milliardbelob',
        headline: 'Erik Damgaard rejser sig: Sælger firma for milliard­beløb',
        newspaper: 'Borsen',
      },
    ],
    // --- END OF FIX ---
    judgeVerdict: null, // This will be populated by the judge
  },
  {
    _id: '68eed225f95b439a159ff66d',
    event_key: 'acquisition-goldman-sachs-industry-ventures-2025-10-14',
    synthesized_headline:
      'Goldman Sachs acquires Industry Ventures for about $1 billion, creating liquidity for owners',
    synthesized_summary:
      'Goldman Sachs acquires venture firm Industry Ventures for just under $1 billion...',
    highest_relevance_score: 92,
    // --- START OF FIX: Add the missing source_articles array ---
    source_articles: [
      {
        link: 'https://borsen.dk/nyheder/finans/goldman-sachs-kober-venturefond-for-1-mia-dollar',
        headline: 'Goldman Sachs køber venturefond for 1 mia. dollar',
        newspaper: 'Borsen',
      },
    ],
    // --- END OF FIX ---
    judgeVerdict: null,
  },
]

// For this test, we can assume no opportunities were generated before stage 4.5
export const mockOpportunitiesToSave = []
