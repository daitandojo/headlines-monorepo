// apps/pipeline/src/file-ingestion/DeduplicationChecker.js
// Three-tier matching against existing Opportunity records
import { Opportunity } from '@headlines/models'
import { callLanguageModel } from '@headlines/ai-services'
import { settings } from '@headlines/config'
import { normaliseName } from './normalise.js'

const FUZZY_MATCH_PROMPT = `You are determining if two names refer to the same person.

Name A: "{inputName}"
Name B: "{candidateName}"

Consider:
- First, middle, and last name variations
- Hyphenated vs non-hyphenated surnames
- Nickname variants (e.g., "Tommy" vs "Thomas")
- Name order variations (Asian naming conventions)
- Common abbreviations

Respond with JSON only:
{
  "samePerson": true|false,
  "confidence": "high|medium|low",
  "reasoning": "one sentence explanation"
}`

export class DeduplicationChecker {
  static async check(individuals) {
    const toEnrich = []
    const alreadyExisting = []

    for (const individual of individuals) {
      const match = await this.findMatch(individual)

      if (match) {
        alreadyExisting.push({
          name: individual.name,
          opportunityId: match._id,
          matchTier: match.tier,
          existingPriority: match.priority,
        })
      } else {
        toEnrich.push(individual)
      }
    }

    return { toEnrich, alreadyExisting }
  }

  static async findMatch(individual) {
    const name = individual.name
    const company = individual.company

    // Tier 1: Exact name match (normalised)
    const normalizedName = normaliseName(name)
    console.log(`    Tier 1 lookup: "${normalizedName}"`)
    
    let tier1 = null
    try {
      tier1 = await Opportunity.findOne({
        reachOutTo: { $regex: new RegExp(`^${normalizedName}$`, 'i') },
      }).lean()
    } catch (e) {
      console.log(`    Tier 1 error: ${e.message}`)
    }

    if (tier1) {
      console.log(`    Tier 1 match: ${name}`)
      return { _id: tier1._id, priority: tier1.priority, tier: 1 }
    }

    // Tier 2: Surname + company match
    const normalizedForSurname = normaliseName(name)
    const surname = this.extractSurname(normalizedForSurname)
    if (surname && company) {
      const tier2 = await Opportunity.findOne({
        surname: { $regex: new RegExp(`^${surname}$`, 'i') },
        'contactDetails.company': { $regex: new RegExp(company, 'i') },
      }).lean()

      if (tier2) {
        console.log(`    Tier 2 match: ${name}`)
        return { _id: tier2._id, priority: tier2.priority, tier: 2 }
      }
    }

    // Tier 3: Fuzzy match via LLM
    console.log(`    Tier 3 search: surname=${surname}`)
    const tier3Match = await this.fuzzyMatch(name, company, surname)
    if (tier3Match) {
      return tier3Match
    }

    console.log(`    No match: ${name}`)
    return null
  }

  static async fuzzyMatch(name, company, surname) {
    console.log(`    fuzzyMatch CALLED: name=${name}, company=${company}, surname=${surname}`)
    if (!surname || surname.length < 4) {
      console.log(`    fuzzyMatch SKIP: surname too short`)
      return null
    }

    // Get candidates with similar surnames
    const candidates = await Opportunity.find({
      surname: { $regex: new RegExp(`^${surname.substring(0, 4)}`, 'i') },
    }).limit(5).lean()

    if (candidates.length === 0) {
      console.log(`    fuzzyMatch NO candidates for ${surname}`)
      return null
    }
    console.log(`    fuzzyMatch FOUND ${candidates.length} candidates: ${candidates.map(c => c.name).join(', ')}`)

    // Ask LLM to match each candidate
    for (const candidate of candidates) {
      console.log(`    Tier 3 fuzzy check: ${name} vs ${candidate.name}...`)
      
      const result = await this.askLLMIfSame(name, candidate.name)
      
      if (result && result.samePerson && result.confidence === 'high') {
        console.log(`    Tier 3 match: ${name} → ${candidate.name} (${result.confidence})`)
        return { _id: candidate._id, priority: candidate.priority, tier: 3 }
      }
    }

    return null
  }

  static async askLLMIfSame(nameA, nameB) {
    try {
      const prompt = FUZZY_MATCH_PROMPT
        .replace('{inputName}', nameA)
        .replace('{candidateName}', nameB)

      const result = await callLanguageModel({
        modelName: settings.LLM_MODEL_UTILITY,
        systemPrompt: prompt,
        userContent: `Compare these two names:\nName A: ${nameA}\nName B: ${nameB}`,
        isJson: true,
        maxTokens: 300,
      })

      if (result && result.samePerson !== undefined) {
        return result
      }
    } catch (error) {
      console.warn(`      LLM fuzzy match error: ${error.message}`)
    }
    return null
  }

  static normalizeName(name) {
    if (!name) return null
    return name.toLowerCase().replace(/[^a-z\s]/g, '').trim()
  }

  static extractSurname(name) {
    if (!name) return null
    const parts = name.trim().split(/\s+/)
    return parts[parts.length - 1]
  }
}