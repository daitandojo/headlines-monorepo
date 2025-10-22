// packages/prompts/src/examples/shotsOutputArticle.js
export const shotsOutputArticle = [
  JSON.stringify({
    reasoning: {
      event_type: 'Operational News',
      is_liquidity_event: false,
      beneficiary: 'Public/Corporate',
    },
    one_line_summary:
      'Operational News: New climate-friendly hydrogen plant to be built in Esbjerg.',
    relevance_article: 10,
    assessment_article: 'Infrastructure project with no direct personal wealth transfer.',
    amount: null,
    key_individuals: [],
    tags: ['infrastructure', 'denmark', 'energy', 'green-hydrogen'],
    transactionType: 'Operational News',
  }),
  JSON.stringify({
    reasoning: {
      event_type: 'M&A / Sale of private company',
      is_liquidity_event: true,
      beneficiary: 'Søren Ejlersen',
    },
    one_line_summary:
      'M&A: Aarstiderne, founded by Søren Ejlersen, sold to an international food giant for a three-digit million sum.',
    relevance_article: 95,
    assessment_article: 'Clear private wealth event for Scandinavian founder.',
    amount: 150,
    key_individuals: [
      {
        name: 'Søren Ejlersen',
        role_in_event: 'Founder & Seller',
        company: 'Aarstiderne',
        email_suggestion: 'soren.ejlersen@aarstiderne.com',
      },
    ],
    tags: ['food-industry', 'denmark', 'acquisition', 'founder-exit'],
    transactionType: 'M&A',
  }),
  JSON.stringify({
    reasoning: {
      event_type: 'Other',
      is_liquidity_event: false,
      beneficiary: 'General Public',
    },
    one_line_summary: 'Noise: General property tax relief for homeowners.',
    relevance_article: 15,
    assessment_article: 'General tax relief is not a substantial direct wealth event.',
    amount: null,
    key_individuals: [],
    tags: ['tax', 'real-estate', 'denmark', 'policy'],
    transactionType: 'Other',
  }),
  JSON.stringify({
    reasoning: {
      event_type: 'M&A / Sale of private company',
      is_liquidity_event: true,
      beneficiary: 'The Møller family',
    },
    one_line_summary:
      'M&A: The Møller family sells their shipping software company, NaviTech, for $500M.',
    relevance_article: 100,
    assessment_article:
      'Substantial wealth event clearly benefiting a Scandinavian family.',
    amount: 500,
    key_individuals: [
      {
        name: 'The Møller family',
        role_in_event: 'Owner & Seller',
        company: 'NaviTech',
        email_suggestion: null,
      },
    ],
    tags: ['software', 'shipping', 'denmark', 'family-wealth', 'acquisition'],
    transactionType: 'M&A',
  }),
  JSON.stringify({
    reasoning: {
      event_type: 'Public Market Transaction',
      is_liquidity_event: false,
      beneficiary: 'Public Shareholders (negatively)',
    },
    one_line_summary:
      'Public Market Noise: Stellantis expects losses due to new US tariffs.',
    relevance_article: 5,
    assessment_article:
      'Irrelevant. Article describes financial losses for a foreign multinational corporation.',
    amount: -43,
    key_individuals: [],
    tags: ['automotive', 'us', 'tariffs', 'public-company'],
    transactionType: 'Public Market Transaction',
  }),
  JSON.stringify({
    reasoning: {
      event_type: 'Legal / Financial Dispute',
      is_liquidity_event: false,
      beneficiary: 'The Østergaard-Nielsen family (USTC)',
    },
    one_line_summary:
      "Legal Dispute: The Østergaard-Nielsen family's conglomerate USTC disputes a million-krone claim related to Nordic Waste.",
    relevance_article: 85,
    assessment_article:
      'High relevance. Confirms a major Rich List family is involved in a significant financial and legal dispute.',
    amount: null,
    key_individuals: [
      {
        name: 'The Østergaard-Nielsen family',
        role_in_event: 'Owner of USTC',
        company: 'USTC',
        email_suggestion: null,
      },
    ],
    tags: ['legal-dispute', 'denmark', 'family-wealth', 'bankruptcy'],
    transactionType: 'Legal/Dispute',
  }),
  JSON.stringify({
    reasoning: {
      event_type: 'M&A / Sale of private company',
      is_liquidity_event: true,
      beneficiary: 'Anna Schmidt',
    },
    one_line_summary:
      'M&A: CEO Anna Schmidt sells family-owned Scandinavian tech firm for $120M.',
    relevance_article: 95,
    assessment_article: 'Substantial wealth event for private Scandinavian individual.',
    amount: 120,
    key_individuals: [
      {
        name: 'Anna Schmidt',
        role_in_event: 'CEO & Seller',
        company: 'Scandinavian tech firm',
        email_suggestion: 'anna.schmidt@scantech.com',
      },
    ],
    tags: ['tech', 'scandinavia', 'acquisition', 'ceo-exit'],
    transactionType: 'M&A',
  }),
  JSON.stringify({
    reasoning: {
      event_type: 'Corporate Funding Round',
      is_liquidity_event: false,
      beneficiary: 'The company (Optheras)',
    },
    one_line_summary: 'Funding Round: Danish startup Optheras raises DKK 38 million.',
    relevance_article: 5,
    assessment_article:
      'Irrelevant. A company raising capital is not a liquidity event for the owners.',
    amount: 6,
    key_individuals: [],
    tags: ['startup', 'denmark', 'funding-round', 'biotech'],
    transactionType: 'Funding Round',
  }),
  JSON.stringify({
    reasoning: {
      event_type: 'Operational News',
      is_liquidity_event: false,
      beneficiary: 'Public Shareholders',
    },
    one_line_summary: 'Operational News: Rockwool plans global expansions.',
    relevance_article: 10,
    assessment_article:
      'Corporate strategy of a public company, no individual wealth generation.',
    amount: null,
    key_individuals: [],
    tags: ['manufacturing', 'global', 'expansion', 'public-company'],
    transactionType: 'Operational News',
  }),
]
