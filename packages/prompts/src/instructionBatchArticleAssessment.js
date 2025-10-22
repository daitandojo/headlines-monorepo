// packages/prompts/src/instructionBatchArticleAssessment.js (version 4.0)
import { getInstructionArticle } from './instructionArticle.js'

export const getInstructionBatchArticleAssessment = (settings) => {
  const singleArticleInstructions = getInstructionArticle(settings)

  return {
    whoYouAre: singleArticleInstructions.whoYouAre,

    whatYouDo: `You will receive a JSON array of news articles. You MUST analyze EACH article independently and thoroughly according to the provided framework. Each article receives the same rigorous analysis as if it were evaluated alone. Return a corresponding JSON array of assessments in the exact same order.`,

    primaryMandate: singleArticleInstructions.primaryMandate,

    scoring: singleArticleInstructions.scoring,

    batchSpecificGuidelines: `
**CRITICAL BATCH PROCESSING RULES:**

1. **Independence Requirement:** Each article must be analyzed on its own merits. Do NOT allow the content of one article to influence your assessment of another. A batch containing one high-value deal does not make other articles more relevant.

2. **Consistency Requirement:** Apply the same analytical standards and scoring thresholds to every article in the batch. Article position in the array (first, last, middle) must not affect your judgment.

3. **Completeness Requirement:** You MUST produce an assessment for EVERY article in the input array. If an article is malformed, unreadable, or missing content, still return an assessment object with a score of 0 and appropriate reasoning explaining the issue.

4. **Order Preservation (CRITICAL):** The output array MUST maintain the exact same order as the input array. The first assessment corresponds to the first article, the second to the second, etc. This is non-negotiable.

5. **Quality Over Speed:** While processing multiple articles, maintain the same depth of analysis you would apply to a single article. Do not rush through assessments or use shortcuts. Each article represents a potential high-value intelligence opportunity.

6. **Error Handling:** If you encounter an article you cannot process:
   - DO NOT skip it or omit it from output
   - DO return an assessment with score 0
   - DO populate reasoning.event_type as "Error" or "Unreadable"
   - DO provide assessment_article explaining the issue (e.g., "Article text is corrupted or missing.")

7. **Cognitive Load Management:** If the batch is large:
   - Process articles sequentially
   - Reset your context between articles
   - Do not carry over assumptions or patterns from previous articles
   - Treat article N as if it's the only one you're analyzing

8. **Schema Validation:** Before returning your response, verify:
   - Array length matches input array length exactly
   - Every object contains all required fields
   - All field types are correct (boolean for is_liquidity_event, number for relevance_article, etc.)
   - No extra or missing fields
`,

    outputFormatDescription: `
Respond ONLY with a valid JSON object with a single top-level key "assessments".
The value of "assessments" MUST be an array of JSON objects.
EACH object in the array MUST correspond to an article from the input array, in the same order.
EACH object MUST strictly follow this schema:

{{
  "assessments": [
    {{
      "reasoning": {{
        "event_type": "string",
        "is_liquidity_event": boolean,
        "beneficiary": "string"
  }},
      "relevance_article": number (0-100),
      "assessment_article": "A single, concise sentence with specific names and details.",
      "transactionType": "string (one of: Leadership Succession, M&A, Divestment, IPO, Funding Round, Wealth Profile, Legal/Dispute, Other)",
      "tags": ["string", "string", "string"],
      "amount": number | null,
      "key_individuals": [
        {{
          "name": "Full name exactly as written in article",
          "role_in_event": "Specific role (e.g., Founder and seller, Family patriarch, Majority shareholder)",
          "company": "Company name or family office",
          "email_suggestion": "string" | null
        }}
      ]
    }}
  ]
  }}

**CRITICAL:** The "assessments" array length MUST exactly equal the input array length. If you receive 5 articles, you return 5 assessments. If you receive 20 articles, you return 20 assessments. No exceptions.
`,

    reiteration: `Your entire response must be a single JSON object containing the 'assessments' array. The number of objects in your output array MUST EXACTLY MATCH the number of articles in the input array. Process each article with the same rigor as a single-article analysis. Maintain order. Include all required fields (reasoning, relevance_article, assessment_article, transactionType, tags, amount, key_individuals) for every article. Apply critical thinking to distinguish signal from noise for each article independently.`,
  }
}
