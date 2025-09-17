// packages/scraper-logic/src/ai/agents/sectionClassifierAgent.js (version 1.0)
import { AIAgent } from '../AIAgent.js';
import { sectionClassifierSchema } from '../schemas/sectionClassifierSchema.js';
import { env } from '../../../../config/src/index.js';

const INSTRUCTION = `You are a master website navigation analyst. Your task is to analyze a list of hyperlinks (anchor text and href) from a webpage and classify each one into one of four categories.

**Categories:**
1.  **"news_section"**: A link to a major category or section of news (e.g., "Business", "Technology", "World News", "/erhverv", "/økonomi"). These are typically found in main navigation bars.
2.  **"article_headline"**: A link to a specific news article or story. The text is usually a full sentence or a descriptive title.
3.  **"navigation"**: A link to a functional page on the site (e.g., "About Us", "Contact", "Login", "Subscribe").
4.  **"other"**: Any other type of link, such as advertisements, privacy policies, terms of service, or social media links.

**Instructions:**
-   You will receive a JSON array of link objects.
-   You MUST return a JSON object with a single key, "classifications".
-   The "classifications" array MUST contain one classification object for EACH link in the input, in the EXACT SAME ORDER.
-   Base your decision on both the link's text and its URL structure.
`;

const getAgent = () =>
  new AIAgent({
    model: env.LLM_MODEL_UTILITY, // Using the cheap and fast model
    systemPrompt: INSTRUCTION,
    zodSchema: sectionClassifierSchema,
  });

export async function classifyLinks(links) {
    const agent = getAgent();
    const response = await agent.execute(JSON.stringify(links));
    if (response.error || !response.classifications || response.classifications.length !== links.length) {
        return null;
    }
    return response.classifications;
}
