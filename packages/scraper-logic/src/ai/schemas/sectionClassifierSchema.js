// packages/scraper-logic/src/ai/schemas/sectionClassifierSchema.js (version 1.0)
import { z } from 'zod';

export const sectionClassifierSchema = z.object({
  classifications: z.array(
    z.object({
      classification: z.enum([
        "news_section", 
        "article_headline", 
        "navigation", 
        "other"
      ]),
      reasoning: z.string().describe("A brief explanation for the classification choice."),
    })
  ),
});
