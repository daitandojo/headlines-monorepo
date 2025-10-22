// packages/prompts/src/instructionBatchHeadlineAssessment.js (version 2.0)
import { instructionHeadlines } from './instructionHeadlines.js'

export const instructionBatchHeadlineAssessment = {
  ...instructionHeadlines,

  whatYouDo: `You will receive a JSON array of news headlines, where each object has an "id" and a "headline". You MUST analyze EACH headline independently and rigorously according to the provided conceptual framework. Each headline receives the same pattern-matching analysis as if it were evaluated alone. Headlines are often vague or misleading—your job is to discern the underlying pattern. Return a corresponding JSON array of assessments in the exact same order, including the original "id" for each.`,

  batchSpecificGuidelines: `
**CRITICAL BATCH PROCESSING RULES:**

1. **ID Preservation (ABSOLUTE REQUIREMENT):** The input is an array of objects: \`[{{"id": "some_id_1", "headline": "..."}}, {{"id": "some_id_2", "headline": "..."}}]\`. Your output for each assessment object MUST include the original \`id\` field unchanged. This is essential for matching your assessment to the source data.

2. **Independence Requirement:** Each headline must be analyzed on its own merits. Do NOT allow one headline to influence your assessment of others. Just because headline #1 is a high-value private sale doesn't make headline #2 (about a similar company) more relevant.

3. **Pattern Recognition Consistency:** Apply the same conceptual framework rigorously to every headline:
   - Does it match one of the 4 core wealth-generating patterns?
   - Does it trigger any ruthless exclusion criteria?
   - What is the underlying event—not just the keywords?

4. **Completeness Requirement:** You MUST produce an assessment for EVERY headline in the input array. If a headline is in a language you cannot translate, missing text, or completely ambiguous:
   - Still return an assessment object with its original \`id\`.
   - Set score to 0.
   - Use assessment_headline to explain: "Unable to translate headline" or "Headline text missing"

5. **Order Preservation (CRITICAL):** The output array MUST maintain the exact same order as the input array. The first assessment corresponds to the first headline, the second to the second, etc. This is non-negotiable for downstream processing.

6. **Translation Accuracy:** For non-English headlines:
   - Translate accurately and preserve meaning
   - Don't over-interpret vague headlines
   - If a headline is ambiguous in the source language, it remains ambiguous in English
   - Populate headline_en with the translated version

7. **Avoid Batch Fatigue:** When processing many headlines:
   - Maintain the same discernment for headline #50 as for headline #1
   - Don't let repetitive corporate news patterns cause you to miss an actual private deal
   - Reset your pattern-matching between each headline
   - Each headline deserves fresh analysis

8. **Signal Density Awareness:** Some batches will be mostly noise (corporate news, public markets). This is expected:
   - Don't feel pressure to "find signals" where none exist
   - It's perfectly acceptable to score 20 consecutive headlines as 0-15 if they're all noise
   - Your value is in accurately identifying the rare high-value signals
   - False positives waste more resources than saying "no signal detected"

9. **Keyword Trap Avoidance:** Headlines often use clickbait or vague language:
   - "Tech giant makes major move" → Could be anything; likely noise
   - "Family fortune in flux" → Could be wealth profile or just speculation
   - "Billionaire shakes up industry" → Is this about personal wealth or company news?
   Parse the actual meaning, not just trigger words.

10. **Schema Validation:** Before returning your response, verify:
    - Array length matches input array length exactly
    - Every object contains all three required fields, plus the original "id"
    - headline_en is a string
    - relevance_headline is a number 0-100
    - assessment_headline is a short phrase, not a full sentence
`,

  outputFormatDescription: `
Respond ONLY with a valid JSON object with a single top-level key "assessments".
The value of "assessments" MUST be an array of JSON objects.
EACH object in the array MUST correspond to a headline from the input array, in the same order.
EACH object MUST strictly follow this schema:

{{
  "assessments": [
    {{
      "id": "original_id_from_input",
      "headline_en": "Translated headline in English (or original if already English)",
      "relevance_headline": number (0-100),
      "assessment_headline": "Short keyword phrase (e.g., 'Private company sale.', 'Public market noise.', 'Fundraising—not liquidity.')"
    }}
  ]
}}

**Examples of Good Assessments:**
- High-value: {{ "id": "xyz", "headline_en": "Family X sells majority stake in TechCorp to EQT", "relevance_headline": 95, "assessment_headline": "Private company sale." }}
- Medium-value: {{ "id": "abc", "headline_en": "SoftwareCo explores strategic options", "relevance_headline": 65, "assessment_headline": "Future liquidity signal." }}
- Low-value: {{ "id": "def", "headline_en": "TechStartup raises Series B funding", "relevance_headline": 10, "assessment_headline": "Fundraising—not liquidity." }}
- Noise: {{ "id": "ghi", "headline_en": "Stock market hits new high", "relevance_headline": 0, "assessment_headline": "Public market noise." }}

**CRITICAL:** The "assessments" array length MUST exactly equal the input array length. The "id" field MUST be present and unchanged in every assessment object.
`,

  reiteration: `Your entire response must be a single JSON object containing the "assessments" array. The number of objects in your output array MUST EXACTLY MATCH the number of headlines in the input array. For each assessment, you MUST include the original "id". Apply the conceptual framework to each headline independently. Maintain order. Use short keyword phrases for assessment_headline. Be ruthless with exclusion criteria—most headlines will be noise (score 0-15). Your value is in accurately identifying the rare high-value private wealth signals (score 85-100).`,
}
