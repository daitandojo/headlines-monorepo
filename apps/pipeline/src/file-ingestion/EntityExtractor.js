// apps/pipeline/src/file-ingestion/EntityExtractor.js
// Extracts entities based on content classification
import { callLanguageModel } from '@headlines/ai-services'
import { settings } from '@headlines/config'
import { CurrencyConverter } from './CurrencyConverter.js'

const RICH_LIST_EXTRACTION_PROMPT = `Extract all named wealthy individuals from the following text.
CRITICAL: In Scandinavian languages, "mia" or "mrD" = billions, "mio" = millions.
- "38 mia. kr." = 38 billion DKK = 38,000 million DKK
- "450 mio. kr." = 450 million DKK

For each individual return exactly this JSON (no markdown, no extra text):
{"name":"full name","rank":number|null,"wealthEstimate":"string as it appears","wealthCurrency":"DKK","wealthAmountDKKMM":number,"company":"company or null","sector":"sector or null","country":"ISO-2 or null","sourceContext":"exact line this was extracted from"}

Output each individual as a separate JSON object on its own line (JSONL format). No brackets, no commas between objects. Extract every individual.`

const INDIVIDUAL_LIST_EXTRACTION_PROMPT = `Extract all named individuals from the following text.
For each return exactly this JSON (no markdown, no extra text):
{"name":"full name","company":"company or null","role":"role or title or null","country":"ISO-2 or null","sourceContext":"exact line extracted from"}

Output each individual as a separate JSON object on its own line (JSONL format). No brackets, no commas between objects.

Handle common list formats:
- Numbered lists (1. Name)
- Bullet lists (- Name, * Name, • Name)
- Table copy-paste (tab or pipe separated)
- Comma-separated inline (Name1, Name2, Name3)
- One name per line

Extract every individual.`

export class EntityExtractor {
  static async extract(content, classification) {
    const { classification: type, detectedLanguage } = classification

    if (type === 'ARTICLE') {
      // Route to existing synthesis pipeline
      console.log('  ARTICLE - routing to existing synthesis pipeline')
      return {
        individuals: [],
        route: 'article',
        errors: [],
      }
    }

    if (type === 'MIXED') {
      // Split and process list portion first
      console.log('  MIXED - extracting list portion')
    }

    // Use appropriate extraction prompt
    const prompt = type === 'RICH_LIST' ? RICH_LIST_EXTRACTION_PROMPT : INDIVIDUAL_LIST_EXTRACTION_PROMPT

    // Chunk content if too long (max ~4000 chars per LLM call)
    const chunks = this.chunkContent(content, 3500)
    console.log(`  Processing ${chunks.length} chunk(s)`)

    const allIndividuals = []
    const errors = []

    for (let i = 0; i < chunks.length; i++) {
      console.log(`  Processing chunk ${i + 1}/${chunks.length}...`)
      
      try {
        const result = await this.extractFromChunk(chunks[i], prompt)
        if (result && Array.isArray(result)) {
          allIndividuals.push(...result)
        }
      } catch (error) {
        errors.push({ chunk: i, error: error.message })
        console.warn(`    Chunk ${i + 1} extraction error: ${error.message}`)
      }
    }

    // Deduplicate by name
    const deduplicated = this.deduplicateByName(allIndividuals)
    
    // Convert currency amounts to EUR
    const converted = type === 'RICH_LIST' 
      ? deduplicated.map(this.convertWealthToEUR)
      : deduplicated
    
    console.log(`  Extracted ${converted.length} unique individuals`)

    return {
      individuals: converted,
      route: 'list',
      errors,
    }
  }

  static convertWealthToEUR(individual) {
    const dkkAmount = individual.wealthAmountDKKMM
    if (!dkkAmount || !individual.wealthCurrency?.includes('DKK')) {
      return individual
    }
    
    const eurAmount = CurrencyConverter.toEURmillions(dkkAmount, 'DKK')
    
    return {
      ...individual,
      wealthAmountMM: eurAmount,
      wealthAmountDKKMM: dkkAmount,
    }
  }

  static chunkContent(content, maxSize) {
    const chunks = []
    const lines = content.split('\n')
    let currentChunk = ''

    for (const line of lines) {
      if ((currentChunk + line).length > maxSize && currentChunk.length > 0) {
        chunks.push(currentChunk)
        currentChunk = ''
      }
      currentChunk += line + '\n'
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk)
    }

    return chunks
  }

  static async extractFromChunk(chunk, prompt) {
    const userContent = `${prompt}\n\nTEXT:\n${chunk}`

    // Don't use isJson - we want raw text to parse JSONL manually
    const result = await callLanguageModel({
      modelName: settings.LLM_MODEL_SYNTHESIS,
      systemPrompt: prompt,
      userContent,
      isJson: false,
      maxTokens: 4000,
    })

    if (result.error) {
      throw new Error(result.error)
    }

    const parsed = []
    const lines = result.trim().split('\n').filter(l => l.trim())
    
    for (const line of lines) {
      try {
        // Skip lines that look like they're not JSON
        if (!line.trim().startsWith('{')) continue
        parsed.push(JSON.parse(line))
      } catch (e) {
        // Skip invalid lines
      }
    }

    return parsed
  }

  static deduplicateByName(individuals) {
    const seen = new Map()

    for (const person of individuals) {
      const normalizedName = this.normalizeName(person.name)
      if (!normalizedName) continue

      if (!seen.has(normalizedName)) {
        seen.set(normalizedName, person)
      } else {
        // Merge: prefer entries with more data
        const existing = seen.get(normalizedName)
        if (!existing.rank && person.rank) existing.rank = person.rank
        if (!existing.wealthAmountMM && person.wealthAmountMM) existing.wealthAmountMM = person.wealthAmountMM
        if (!existing.company && person.company) existing.company = person.company
      }
    }

    return Array.from(seen.values())
  }

  static normalizeName(name) {
    if (!name) return null
    return name.toLowerCase().replace(/[^a-z\s]/g, '').trim()
  }
}