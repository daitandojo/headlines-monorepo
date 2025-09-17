// packages/prompts/src/instructionBatchHeadlineAssessment.js (version 1.0)
import { instructionHeadlines } from './instructionHeadlines.js'

export const instructionBatchHeadlineAssessment = {
  ...instructionHeadlines,
  whatYouDo: 'You will receive a JSON array of news headlines. You MUST analyze EACH headline independently according to the provided framework and return a corresponding JSON array of assessments.',
  outputFormatDescription: `
    Respond ONLY with a valid JSON object with a single top-level key "assessments".
    The value of "assessments" MUST be an array of JSON objects.
    EACH object in the array MUST correspond to a headline from the input array, in the same order.
    EACH object MUST strictly follow this schema:
    {{
      "headline_en": "Translated headline in English",
      "relevance_headline": "number (0-100)",
      "assessment_headline": "A single, concise sentence explaining the score."
    }}
  `,
  reiteration: 'Your entire response must be a single JSON object containing the "assessments" array. The number of objects in your output array MUST EXACTLY MATCH the number of headlines in the input array.',
};
