// packages/ai-services/src/enrichment/localizedSearch.js
// GAP 3: Non-English source queries
import { callLanguageModel } from '../lib/langchain.js'

function getSettings() {
  try {
    return require('@headlines/config')
  } catch (e) {
    return { settings: { LLM_MODEL_UTILITY: 'xiaomi/mimo-v2-flash' } }
  }
}

const COUNTRY_PRESS = {
  DK: { lang: 'Danish', pubs: ['Børsen', 'Finans'] },
  NL: { lang: 'Dutch', pubs: ['Het Financieele Dagblad', 'NRC'] },
  DE: { lang: 'German', pubs: ['Handelsblatt', 'Manager Magazin'] },
  AT: { lang: 'German', pubs: ['Wirtschaftsblatt', 'Der Standard'] },
  CH: { lang: 'German', pubs: ['Bilanz', 'Handelszeitung'] },
  SE: { lang: 'Swedish', pubs: ['Dagens industri', 'Veckans Affärer'] },
  NO: { lang: 'Norwegian', pubs: ['Dagens Næringsliv', 'Kapital'] },
  FR: { lang: 'French', pubs: ['Les Echos', 'Le Figaro Économie'] },
  IT: { lang: 'Italian', pubs: ['Il Sole 24 Ore', 'Milano Finanza'] },
  ES: { lang: 'Spanish', pubs: ['Expansión', 'Cinco Días'] },
  FI: { lang: 'Finnish', pubs: ['Kauppalehti', 'Talouselämä'] },
  BE: { lang: 'Dutch', pubs: ['De Tijd', "L'Echo"] },
  PT: { lang: 'Portuguese', pubs: ['Jornal de Negócios', 'Público'] },
}

export async function buildLocalizedQueries(englishQuery, countryCode) {
  const result = {
    english: englishQuery,
    localized: null,
    language: null,
    publications: [],
  }
  
  if (!countryCode || !COUNTRY_PRESS[countryCode]) {
    return result
  }
  
  const { lang, pubs } = COUNTRY_PRESS[countryCode]
  result.language = lang
  result.publications = pubs
  
  try {
    const systemPrompt = `Translate this search query to ${lang}. Return ONLY the translated query, nothing else.`
    const userContent = `Query: "${englishQuery}"`
    
    const llmResult = await callLanguageModel({
      modelName: getSettings().settings?.LLM_MODEL_UTILITY || 'xiaomi/mimo-v2-flash',
      systemPrompt,
      userContent,
      isJson: false,
    })
    
    if (llmResult && llmResult.length > 3) {
      result.localized = llmResult.trim()
    }
  } catch (err) {
    // Keep result.localized as null
  }
  
  return result
}