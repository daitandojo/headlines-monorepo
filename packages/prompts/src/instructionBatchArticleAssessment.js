// packages/prompts/src/instructionBatchArticleAssessment.js (version 3.1)
import { getInstructionArticle } from './instructionArticle.js'

export const getInstructionBatchArticleAssessment = (settings) => {
  const singleArticleInstructions = getInstructionArticle(settings)

  return {
    whoYouAre: singleArticleInstructions.whoYouAre,
    whatYouDo:
      'You will receive a JSON array of news articles. You MUST analyze EACH article independently according to the provided framework and return a corresponding JSON array of assessments.',
    primaryMandate: singleArticleInstructions.primaryMandate,
    analyticalFramework: singleArticleInstructions.analyticalFramework,
    scoring: singleArticleInstructions.scoring,
    outputFormatDescription: `
            Respond ONLY with a valid JSON object with a single top-level key "assessments".
            The value of "assessments" MUST be an array of JSON objects.
            EACH object in the array MUST correspond to an article from the input array, in the same order.
            EACH object MUST strictly follow this schema:
            {{
              "reasoning": {{ "event_type": "...", "is_liquidity_event": boolean, "beneficiary": "..." }},
              "relevance_article": number (0-100),
              "assessment_article": "A single, concise sentence.",
              "amount": number | null,
              "key_individuals": [ {{ "name": "...", "role_in_event": "...", "company": "...", "email_suggestion": "..." | null }} ]
            }}
        `,
    reiteration:
      "Your entire response must be a single JSON object containing the 'assessments' array. The number of objects in your output array MUST EXACTLY MATCH the number of articles in the input array.",
  }
}
