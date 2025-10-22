// packages/models/src/schemas/synthesisSchema.js
import { z } from 'zod'

// NEW: Sub-schemas for new data structures.
const transactionDetailsSchema = z.object({
  transactionType: z
    .string()
    .describe("The type of event, e.g., 'Leadership succession', 'M&A'."),
  valuationAtEventUSD: z
    .number()
    .nullable()
    .describe('The company valuation at the time of the event in millions USD, or null.'),
  ownershipPercentageChange: z
    .number()
    .nullable()
    .describe('The change in ownership percentage for the primary subject, or null.'),
  liquidityFlow: z.object({
    from: z.string().nullable().describe('Entity where liquidity originates.'),
    to: z.string().nullable().describe('Entity receiving the liquidity.'),
    approxAmountUSD: z
      .number()
      .nullable()
      .describe('Approximate liquid amount transferred in millions USD, or null.'),
    nature: z.string().nullable().describe('A brief description of the flow.'),
  }),
})

const primarySubjectSchema = z.object({
  name: z.string().min(0).describe('The primary person or family name for this event.'),
  role: z.string().min(0).describe('Their role in the event (e.g., "Founder and CEO").'),
})

export const synthesisSchema = z.object({
  events: z.array(
    z.object({
      headline: z.string().min(1),
      summary: z.string().min(1),
      advisor_summary: z
        .string()
        .min(1)
        .describe('The one-sentence actionable summary for wealth advisors.'),
      eventClassification: z.string().min(1).describe("The event's classification type."),
      country: z.array(z.string()).min(1, 'Country array cannot be empty.'),
      key_individuals: z.array(
        z.object({
          name: z.string(),
          role_in_event: z.string(),
          company: z.string().nullable(),
          email_suggestion: z.string().nullable(),
        })
      ),
      // NEW: Adding all the new fields to the Zod schema for the AI to populate.
      transactionDetails: transactionDetailsSchema,
      primarySubject: primarySubjectSchema,
      relatedCompanies: z
        .array(z.string())
        .describe('A list of other relevant company names.'),
      tags: z.array(z.string()).describe('An array of 3-5 relevant lowercase tags.'),
      eventStatus: z
        .enum(['Completed', 'Pending', 'Rumored'])
        .describe('The current status of the event.'),
    })
  ),
})
