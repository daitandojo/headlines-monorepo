// packages/prompts/src/examples/shotsOutputArticle.js (version 4.0)
export const shotsOutputArticle = [
  JSON.stringify({
    reasoning: {
      event_type: 'Operational News',
      is_liquidity_event: false,
      beneficiary: 'Public/Corporate',
    },
    relevance_article: 10,
    assessment_article: 'Infrastructure project with no direct personal wealth transfer.',
    amount: null,
    key_individuals: [],
  }),
  JSON.stringify({
    reasoning: {
      event_type: 'M&A / Sale of private company',
      is_liquidity_event: true,
      beneficiary: 'Søren Ejlersen',
    },
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
  }),
  JSON.stringify({
    reasoning: {
      event_type: 'Other',
      is_liquidity_event: false,
      beneficiary: 'General Public',
    },
    relevance_article: 15,
    assessment_article: 'General tax relief is not a substantial direct wealth event.',
    amount: null,
    key_individuals: [],
  }),
  JSON.stringify({
    reasoning: {
      event_type: 'M&A / Sale of private company',
      is_liquidity_event: true,
      beneficiary: 'The Møller family',
    },
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
  }),
  JSON.stringify({
    reasoning: {
      event_type: 'Public Market Transaction',
      is_liquidity_event: false,
      beneficiary: 'Public Shareholders (negatively)',
    },
    relevance_article: 5,
    assessment_article:
      'Irrelevant. Article describes financial losses for a foreign multinational corporation.',
    amount: -43,
    key_individuals: [],
  }),
  JSON.stringify({
    reasoning: {
      event_type: 'Legal / Financial Dispute',
      is_liquidity_event: false,
      beneficiary: 'The Østergaard-Nielsen family (USTC)',
    },
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
  }),
  JSON.stringify({
    reasoning: {
      event_type: 'M&A / Sale of private company',
      is_liquidity_event: true,
      beneficiary: 'Anna Schmidt',
    },
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
  }),
  JSON.stringify({
    reasoning: {
      event_type: 'Corporate Funding Round',
      is_liquidity_event: false,
      beneficiary: 'The company (Optheras)',
    },
    relevance_article: 5,
    assessment_article:
      'Irrelevant. A company raising capital is not a liquidity event for the owners.',
    amount: 6,
    key_individuals: [],
  }),
  JSON.stringify({
    reasoning: {
      event_type: 'Operational News',
      is_liquidity_event: false,
      beneficiary: 'Public Shareholders',
    },
    relevance_article: 10,
    assessment_article:
      'Corporate strategy of a public company, no individual wealth generation.',
    amount: null,
    key_individuals: [],
  }),
]
