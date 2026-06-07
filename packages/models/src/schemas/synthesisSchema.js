// packages/models/src/schemas/synthesisSchema.js
import { z } from 'zod'

// NEW: Sub-schemas for new data structures.
const transactionDetailsSchema = z.object({
  transactionType: z
    .union([z.string(), z.null()])
    .transform((val) => (val === null ? null : val))
    .pipe(z.string().nullable())
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
  }).nullable(),
  // PHASE 1: UBO drill-down
  sellerUBOs: z
    .array(
      z.object({
        name: z.string().describe('Name of the beneficial owner receiving liquidity.'),
        role: z.string().nullable().optional().describe('Their role (e.g., "Founder", "PE Partner").'),
        company: z.string().nullable().optional().describe('Their primary company.'),
        estimatedProceedsMM: z
          .number()
          .nullable()
          .optional()
          .describe('Estimated proceeds in USD millions.'),
      })
    )
    .default([]),
  buyerUBOs: z
    .array(
      z.object({
        name: z.string().describe('Name of the beneficial owner / fund partner on buyer side.'),
        role: z.string().nullable().optional().describe('Their role (e.g., "Managing Partner", "CEO").'),
        firm: z.string().nullable().optional().describe('PE firm or acquiring entity.'),
      })
    )
    .default([]),
})

const primarySubjectSchema = z.object({
  name: z.string().min(0).describe('The primary person or family name for this event.'),
  role: z.string().min(0).describe('Their role in the event (e.g., "Founder and CEO").'),
})

const triggerClassSchema = z.enum([
  'TC1_FAMILY_FOUNDER',
  'TC2_MA_BUYER',
  'TC3_MA_SELLER',
  'TC4_PRIVATE_EQUITY',
  'TC5_LISTED_COMPANY',
  'TC6_REAL_ESTATE',
  'TC7_PHILANTHROPY',
  'TC8_SUCCESSION',
  'TC9_IPO',
  'TC10_LUXURY_ASSET',
  'Other',
]).describe('Trigger class driving this opportunity (audit #1-10, or Other).')

const successionSignalsSchema = z.object({
  founderAgeOver65: z.boolean().nullable().optional(),
  externalCEOAppointed: z.boolean().nullable().optional(),
  peMinorityStake: z.boolean().nullable().optional(),
  namedHeirApparent: z.string().nullable().optional(),
  score: z.number().min(0).max(3).default(0),
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
      country: z
        .union([z.array(z.string()).min(1), z.array(z.string()).length(0).transform(() => ['Unknown'])])
        .describe('Countries where this event is relevant.'),
      key_individuals: z.array(
        z.object({
          name: z
            .union([z.string(), z.null(), z.undefined()])
            .transform((val) => (val === null || val === undefined ? null : val))
            .pipe(z.string().nullable()),
          role_in_event: z
            .union([z.string(), z.null(), z.undefined()])
            .transform((val) => (val === null || val === undefined ? null : val))
            .pipe(z.string().nullable()),
          company: z.string().nullable(),
          email_suggestion: z.string().nullable(),
        })
      ),
      transactionDetails: transactionDetailsSchema,
      primarySubject: primarySubjectSchema,
      relatedCompanies: z
        .array(z.string())
        .describe('A list of other relevant company names.'),
      tags: z.array(z.string()).describe('An array of 3-5 relevant lowercase tags.'),
      eventStatus: z
        .enum(['Completed', 'Pending', 'Rumored', 'Other'])
        .describe('The current status of the event.'),
      // PHASE 1: Trigger classification
      triggerClass: triggerClassSchema,
      // PHASE 1: Succession signals
      successionSignals: successionSignalsSchema,
      // PHASE 1: Liquidity event timing
      dealCloseDate: z.string().nullable().optional(),
      // PHASE 2: Deal lifecycle + pre-deal signals
      dealStatus: z.enum(['rumor', 'announced', 'pending', 'completed', 'cancelled']).optional(),
      preDealSignals: z.array(z.object({
        signal: z.string(),
        confidence: z.number().min(0).max(100),
        source: z.string(),
      })).optional().default([]),
      // PHASE 2: Company financials
      companyFinancials: z.object({
        revenueMM: z.number().nullable().optional(),
        profitMM: z.number().nullable().optional(),
        debtMM: z.number().nullable().optional(),
        revenueGrowthPercent: z.number().nullable().optional(),
      }).optional(),
    })
  ),
})
