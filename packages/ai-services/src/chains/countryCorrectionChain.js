// packages/ai-services/src/chains/countryCorrectionChain.js
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { RunnableSequence } from '@langchain/core/runnables'
import { getUtilityModel } from '../lib/langchain.js'
import { safeInvoke } from '../lib/safeInvoke.js'
import { countryCorrectionSchema } from '@headlines/models/schemas'

const systemPrompt = `You are a data cleaning expert. Your sole task is to analyze a given text string that is supposed to represent a country and extract the single, correct, UN-recognized sovereign country name from it.

**CRITICAL INSTRUCTIONS:**
1.  Analyze the input string.
2.  Identify the most likely country. For example, "Denmark (Aarhus)" should be "Denmark". "London" should be "United Kingdom".
4.  Anything starting with "Central Europe" should be "Europe".
5.  "Denmark & Sweden" should be "Scandinavia"
6.  "International" should be "Global"
7. "Nordic Region" should be "Scandinavia" (also if followed by something between brackets)
8. "Pan-Europe" should be "Europe"
9. "Sweden & Norway" should be "Scandinavia"
10. "United States" should be "United States of America"
11. "UK" should be "United Kingdom"
12. anything starting with "Unknown" should simply be "Unknown"
13.  If a valid country name can be determined, return it.
14.  If the input is ambiguous or does not contain a clear country, you MUST return null.
15.  You MUST respond ONLY with a valid JSON object in this format: {{"country": "Correct Country Name"}} or {{"country": null}}`

const prompt = ChatPromptTemplate.fromMessages([
  ['system', systemPrompt],
  ['human', 'Location String: "{location_string}"'],
])

// --- DEFINITIVE FIX ---
// The chain now ends with the model. The JsonOutputParser has been removed.
// The new safeInvoke function will handle the parsing robustly.
const chain = RunnableSequence.from([prompt, getUtilityModel()])

export const countryCorrectionChain = {
  invoke: (input) =>
    safeInvoke(chain, input, 'countryCorrectionChain', countryCorrectionSchema),
}
