// apps/pipeline/src/utils/localizedSearchTerms.js
// Maps country codes and names to localized wealth-related search terms.
// Danish papers write about Danish UHNW in Danish — searching in English misses them.

const COUNTRY_TERMS = {
  // Denmark
  Denmark: {
    countryCode: 'DK',
    wealth: 'formue', netWorth: 'nettoformue', fortune: 'formue',
    billionaire: 'milliardær', millionaire: 'millionær',
    familyOffice: '"family office" OR formueforvaltning OR familiekontor',
    investor: 'investor', investment: 'investering',
    richList: 'rigmandsliste OR formuerangliste',
    inheritance: 'arv', succession: 'succession',
    owner: 'ejer', founder: 'grundlægger',
    realEstate: 'ejendom', luxury: 'luksus',
  },
  // Netherlands
  Netherlands: {
    countryCode: 'NL',
    wealth: 'vermogen', netWorth: 'nettowaarde OR vermogen',
    fortune: 'fortuin', billionaire: 'miljardair',
    millionaire: 'miljonair',
    familyOffice: '"family office" OR familievermogen OR vermogensbeheer',
    investor: 'investeerder', investment: 'belegging',
    richList: 'rijkstenlijst OR Quote 500',
    inheritance: 'erfenis', succession: 'opvolging',
    owner: 'eigenaar', founder: 'oprichter',
    realEstate: 'onroerend goed', luxury: 'luxe',
  },
  // Sweden
  Sweden: {
    countryCode: 'SE',
    wealth: 'förmögenhet', netWorth: 'nettoförmögenhet',
    fortune: 'förmögenhet', billionaire: 'miljardär',
    millionaire: 'miljonär',
    familyOffice: 'familjekontor OR "family office"',
    investor: 'investerare', investment: 'investering',
    richList: 'miljardärslista',
    inheritance: 'arv', succession: 'succession',
    owner: 'ägare', founder: 'grundare',
  },
  // Norway
  Norway: {
    countryCode: 'NO',
    wealth: 'formue', netWorth: 'nettoformue',
    fortune: 'formue', billionaire: 'milliardær',
    millionaire: 'millionær',
    familyOffice: '"family office" OR formuesforvaltning',
    investor: 'investor', investment: 'investering',
    inheritage: 'arv', owner: 'eier', founder: 'gründer',
  },
  // Germany
  Germany: {
    countryCode: 'DE',
    wealth: 'Vermögen', netWorth: 'Nettovermögen',
    fortune: 'Vermögen', billionaire: 'Milliardär',
    millionaire: 'Millionär',
    familyOffice: '"Family Office" OR Vermögensverwaltung',
    investor: 'Investor', investment: 'Investition',
    richList: 'Milliardärsliste OR reichsten Deutschen',
    inheritance: 'Erbschaft', succession: 'Nachfolge',
    owner: 'Eigentümer', founder: 'Gründer',
  },
  // Spain
  Spain: {
    countryCode: 'ES',
    wealth: 'patrimonio', netWorth: 'patrimonio neto',
    fortune: 'fortuna', billionaire: 'multimillonario',
    millionaire: 'millonario',
    familyOffice: '"family office" OR oficina familiar',
    investor: 'inversor', investment: 'inversión',
    richList: 'lista de ricos',
    inheritance: 'herencia', owner: 'propietario', founder: 'fundador',
  },
  // France
  France: {
    countryCode: 'FR',
    wealth: 'patrimoine', netWorth: 'patrimoine net',
    fortune: 'fortune', billionaire: 'milliardaire',
    millionaire: 'millionnaire',
    familyOffice: '"family office" OR gestion de patrimoine',
    investor: 'investisseur', investment: 'investissement',
    richList: 'classement des fortunes',
    inheritance: 'héritage', owner: 'propriétaire', founder: 'fondateur',
  },
  // United Kingdom
  'United Kingdom': {
    countryCode: 'GB',
    wealth: 'wealth', netWorth: 'net worth',
    billionaire: 'billionaire',
    familyOffice: '"family office"',
    investor: 'investor',
    richList: 'rich list OR Sunday Times Rich List',
    inheritance: 'inheritance', owner: 'owner', founder: 'founder',
  },
  // United States
  'United States': {
    countryCode: 'US',
    wealth: 'wealth', netWorth: 'net worth',
    billionaire: 'billionaire',
    familyOffice: '"family office"',
    investor: 'investor',
    richList: 'Forbes list OR billionaire list',
    inheritance: 'inheritance', owner: 'owner', founder: 'founder',
  },
}

const DEFAULT_TERMS = COUNTRY_TERMS['United States']

function normalizeCountry(country) {
  if (!country) return null
  const c = country.trim()
  // Direct match
  if (COUNTRY_TERMS[c]) return c
  // Case-insensitive
  const lower = c.toLowerCase()
  for (const key of Object.keys(COUNTRY_TERMS)) {
    if (key.toLowerCase() === lower) return key
  }
  // ISO code match
  for (const [name, data] of Object.entries(COUNTRY_TERMS)) {
    if (data.countryCode === c.toUpperCase()) return name
  }
  return null
}

export function getSearchTerms(country) {
  const key = normalizeCountry(country)
  return key ? COUNTRY_TERMS[key] : DEFAULT_TERMS
}

export function buildLocalizedQuery(baseQuery, termCategory, country) {
  const terms = getSearchTerms(country)
  const localizedTerm = terms[termCategory]
  if (!localizedTerm) return baseQuery
  return `"${baseQuery}" ${localizedTerm}`
}

export function buildFOQuery(surname, country) {
  const terms = getSearchTerms(country)
  const foTerm = terms.familyOffice || '"family office"'
  return `"${surname}" ${foTerm}`
}

export function buildWealthQuery(entityName, country) {
  const terms = getSearchTerms(country)
  const wealthTerm = terms.wealth
  const netWorthTerm = terms.netWorth
  return `"${entityName}" (${wealthTerm} OR ${netWorthTerm})`
}

export function buildInvestmentQuery(entityName, country) {
  const terms = getSearchTerms(country)
  const investorTerm = terms.investor
  const investTerm = terms.investment
  return `"${entityName}" ${investorTerm} OR ${investTerm}`
}

export function getLocalizedSearchTerms(country) {
  const key = normalizeCountry(country)
  if (!key) return null
  return {
    countryName: key,
    countryCode: COUNTRY_TERMS[key].countryCode,
    terms: COUNTRY_TERMS[key],
    searchLanguage: key === 'Denmark' ? 'da' : key === 'Netherlands' ? 'nl' : key === 'Sweden' ? 'sv' : key === 'Germany' ? 'de' : key === 'Norway' ? 'no' : key === 'France' ? 'fr' : key === 'Spain' ? 'es' : 'en',
  }
}