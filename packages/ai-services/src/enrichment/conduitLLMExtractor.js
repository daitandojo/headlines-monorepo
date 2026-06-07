// packages/ai-services/src/enrichment/conduitLLMExtractor.js
// STEP 2: LLM-based conduit extraction (supplements regex)
import { z } from 'zod'
import { callLanguageModel } from '../index.js'

function getSettings() {
  try {
    return require('@headlines/config')
  } catch (e) {
    return { settings: { LLM_MODEL_UTILITY: 'deepseek/deepseek-v4-flash' } }
  }
}

const conduitSchema = z.object({
  conduits: z.array(
    z.object({
      name: z.string().describe('Full name of the conduit'),
      role: z.enum(['pa', 'cfo', 'legal', 'tax', 'trust', 'banker', 'advisor', 'other']).describe('Conduit role type'),
      firm: z.string().nullable().describe('Firm name'),
      relationship: z.string().describe('How they are connected to the beneficiary'),
      contact_hint: z.string().nullable().describe('Email or phone if available'),
      confidence: z.enum(['confirmed', 'probable', 'possible']),
    })
  ),
})

export async function extractConduitsWithLLM(text, targetName, targetCountry) {
  if (!text || text.length < 50) return []

  const systemPrompt = `You are a professional network analyst. Given raw text about a UHNW individual, extract any professional intermediaries (conduits) who could facilitate an introduction.

Conduits include: Personal Assistant (PA), CFO, Legal Counsel, Tax Advisor, Trustee/Fiduciary, Private Banker, Wealth Manager, Estate Solicitor.

For each conduit found, provide:
- name: Full name (e.g., "Maria Hansen", not "PA")
- role: One of: pa, cfo, legal, tax, trust, banker, advisor
- firm: Company/firm name if available
- relationship: How they connect to the target (e.g., "personal assistant to", "external counsel for")
- contact_hint: Any email/phone if explicitly mentioned
- confidence: "confirmed" if name+firm are explicit, "probable" if only firm role is mentioned, "possible" if inferred

IMPORTANT: Extract ONLY actual named individuals. Do NOT guess names.`

  const userContent = `Target Person: ${targetName}
Country context: ${targetCountry || 'Denmark'}
Raw intelligence text:
${text}

Extract all conduits. Return valid JSON.`

  try {
    const cfg = getSettings()
    const result = await callLanguageModel({
      modelName: cfg.settings?.LLM_MODEL_UTILITY || 'deepseek/deepseek-v4-flash',
      systemPrompt,
      userContent,
      isJson: true,
    })
    if (result.error || !result.conduits) return []
    return result.conduits
  } catch (err) {
    return []
  }
}