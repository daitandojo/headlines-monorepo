// packages/ai-services/src/schemas/countryCorrectionSchema.js
import { z } from 'zod';

export const countryCorrectionSchema = z.object({
  country: z.string().nullable().describe("The single, corrected, UN-recognized country name, or null if not determinable."),
});
