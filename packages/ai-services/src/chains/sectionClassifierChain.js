// packages/ai-services/src/chains/sectionClassifierChain.js (version 2.3.0)
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { JsonOutputParser } from '@langchain/core/output_parsers'
import { RunnableSequence } from '@langchain/core/runnables'
import { getUtilityModel } from '../lib/langchain.js' // Correctly import the getter function
import { safeInvoke } from '../lib/safeInvoke.js'
import { sectionClassifierSchema } from '@headlines/models/schemas'

const INSTRUCTION = {
  whoYouAre:
    'You are a master website navigation analyst. Your task is to analyze a list of hyperlinks (anchor text and href) from a webpage and classify each one into one of four categories.',
  guidelines: [
    '**Categories:**',
    '1.  **"news_section"**: A link to a major category or section of news (e.g., "Business", "Technology", "World News", "/erhverv", "/økonomi").',
    '2.  **"article_headline"**: A link to a specific news article or story. The text is usually a full sentence or a descriptive title.',
    '3.  **"navigation"**: A link to a functional page on the site (e.g., "About Us", "Contact", "Login").',
    '4.  **"other"**: Any other type of link (advertisements, privacy policies, etc.).',
    '**Instructions:**',
    '-   You will receive a JSON array of link objects.',
    '-   You MUST return a JSON object with a single key, "classifications".',
    '-   The "classifications" array MUST contain one classification object for EACH link in the input, in the EXACT SAME ORDER.',
  ],
}

const systemPrompt = [INSTRUCTION.whoYouAre, ...INSTRUCTION.guidelines].join('\n\n')
const fullPrompt = `${systemPrompt}\n\nUser Input:\n{links_json_string}`
const prompt = ChatPromptTemplate.fromTemplate(fullPrompt)
// --- DEFINITIVE FIX ---
// The chain now ends with the model. The JsonOutputParser is removed.
const chain = RunnableSequence.from([prompt, getUtilityModel()]) // Call the getter function

export const sectionClassifierChain = {
  invoke: (input) =>
    safeInvoke(chain, input, 'sectionClassifierChain', sectionClassifierSchema),
}
