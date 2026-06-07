// packages/models/src/schemas/opportunitySchema.js
import { z } from "zod";

// Trigger classes for Phase 1 expansion (audit: #1-10)
export const TRIGGER_CLASSES = [
  "TC1_FAMILY_FOUNDER",    // Family-owned / founder-led business
  "TC2_MA_BUYER",          // M&A — buyer side
  "TC3_MA_SELLER",         // M&A — target / seller side
  "TC4_PRIVATE_EQUITY",    // PE fund / growth fund mentioned
  "TC5_LISTED_COMPANY",    // Listed company
  "TC6_REAL_ESTATE",      // Real estate transaction
  "TC7_PHILANTHROPY",     // Philanthropy / foundation
  "TC8_SUCCESSION",       // Succession / inheritance / estate
  "TC9_IPO",              // IPO / listing
  "TC10_LUXURY_ASSET",    // Sports / arts / luxury asset
  "TC11_RICH_LIST",       // Rich list / forbes list entry
  "TC12_INDIVIDUAL_LIST" // Individual list / database entry
]

// Opportunity types
export const OPPORTUNITY_TYPES = [
  "beneficiary",  // Direct wealth holder
  "conduit",      // Professional intermediary (PA, CFO, lawyer etc.)
]

// Priority levels
export const PRIORITY_LEVELS = ["high", "medium", "low"]

// --- Sub-schemas ---

const conduitSchema = z.object({
  name: z.string(),
  role: z.string().nullable().optional(),
  firm: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  relationship: z.string().nullable().optional(),
  type: z.enum(["pa", "cfo", "legal", "tax", "trust", "banker", "advisor", "other"])
    .nullable()
    .optional(),
})

const accessPathSchema = z.object({
  familyOffice: z.string().nullable().optional(),
  primaryContact: z
    .object({
      name: z.string(),
      role: z.string().nullable().optional(),
      email: z.string().nullable().optional(),
      phone: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  conduits: z.array(conduitSchema).default([]),
  incumbentWM: z.string().nullable().optional(),
})

const liquidityEventSchema = z.object({
  type: z.enum([
    "exit_proceeds",
    "dividend",
    "earnout",
    "fundraise",
    "ipo_lockup",
    "probate",
    "succession",
    "management_buyout",
    "pe_exit",
    "asset_sale",
    "other",
  ]).nullable().optional(),
  description: z.string().nullable().optional(),
  estimatedAmountMM: z
    .union([z.number(), z.string(), z.null(), z.undefined()])
    .transform((val) => {
      if (val === null || val === undefined) return null;
      if (typeof val === "number") return val;
      if (typeof val === "string") {
        const parsed = parseFloat(val);
        return isNaN(parsed) ? null : parsed;
      }
      return null;
    })
    .pipe(z.number().nullable().optional()),
estimatedCurrency: z.string().nullable().optional(),
    timingType: z.enum(["past", "pending", "rumored"]).nullable().optional(),
    estimatedDate: z.string().nullable().optional(),
    dealCloseDate: z.string().nullable().optional(),
    source: z.string().nullable().optional(),
  })
  .transform((val) => {
    if (!val) return val;
    return val;
  })

// This is the definitive, unified schema for a rich dossier.
const profileSchema = z
  .object({
    profilePhotoUrl: z.string().url().nullable().optional(),
    yearOfBirth: z
      .union([z.number(), z.string(), z.null(), z.undefined()])
      .transform((val) => {
        if (val === null || val === undefined) return null;
        if (typeof val === "number") return val;
        if (typeof val === "string") {
          const parsed = parseInt(val, 10);
          return isNaN(parsed) ? null : parsed;
        }
        return null;
      })
      .pipe(z.number().nullable().optional()),
    biography: z.string().nullable().optional(),
    estimatedNetWorthMM: z
      .union([z.number(), z.string(), z.null(), z.undefined()])
      .transform((val) => {
        if (val === null || val === undefined) return 0;
        if (typeof val === "number") return val;
        if (typeof val === "string") {
          const parsed = parseFloat(val);
          return isNaN(parsed) ? 0 : parsed;
        }
        return 0;
      })
      .pipe(z.number().default(0)),
    wealthOrigin: z.string().nullable().optional(),
    familyOffice: z
      .object({
        name: z.string().nullable().optional(),
        officer: z.string().nullable().optional(),
      })
      .nullable()
      .optional(),
    assetAllocation: z.string().nullable().optional(),
    investmentInterests: z.array(z.string()).optional(),
    directInvestments: z.array(z.string()).optional(),
    philanthropicInterests: z.array(z.string()).optional(),
    hobbies: z.array(z.string()).optional(),
    specialInterests: z.array(z.string()).optional(),
    children: z.array(z.string()).optional(),
    dossierQuality: z.enum(["bronze", "silver", "gold"]).default("bronze"),
    // PHASE 1: Deep profiling fields
    assetFootprint: z.array(z.string()).default([]),
    network: z.array(z.string()).default([]),
    // Conduit fields
    personalAssistant: z.string().nullable().optional(),
    taxAdvisor: z.string().nullable().optional(),
    solicitor: z.string().nullable().optional(),
    trustCompany: z.string().nullable().optional(),
    // Successors & heirs
    heirsApparent: z.array(z.string()).default([]),
    // Liquidity calendar
    liquidityCalendar: z.string().nullable().optional(),
    // Pain points
    painPoints: z.array(z.string()).default([]),
    // Openness signals
    opennessSignals: z.array(z.string()).default([]),
    // Incumbent bank
    incumbentBank: z.string().nullable().optional(),
    // Domicile
    primaryResidence: z.string().nullable().optional(),
    secondaryResidences: z.array(z.string()).default([]),
    recentRelocation: z.boolean().nullable().optional(),
  })
  .passthrough(); // Use passthrough to be more robust against extra fields from the AI

export const opportunitySchema = z.object({
  opportunities: z.union([z.array(
    z
      .object({
        reachOutTo: z
          .union([z.string().min(1), z.array(z.any())])
          .transform((v) => {
            if (Array.isArray(v)) return v[0] || 'Unknown Person'
            return v
          }),
        // PHASE 1: Type distinction
        type: z.enum(OPPORTUNITY_TYPES).default("beneficiary"),
        // PHASE 1: Trigger classification
        triggerClass: z.enum(TRIGGER_CLASSES).nullable().optional(),
        triggerSummary: z.string().nullable().optional(),
        // Wealth estimate (range string for display)
        wealthEstimate: z.string().nullable().optional(),
        // Contact
        contactDetails: z
          .union([
            z.object({
              email: z
                .union([z.string().email(), z.array(z.any()), z.literal(''), z.null(), z.undefined()])
                .transform((val) => {
                  if (Array.isArray(val)) return undefined
                  if (!val) return undefined
                  return val
                }),
              role: z
                .union([z.string(), z.array(z.any()), z.null(), z.undefined()])
                .transform((val) => {
                  if (Array.isArray(val)) return undefined
                  return val || undefined
                }),
              company: z
                .union([z.string(), z.array(z.any()), z.null(), z.undefined()])
                .transform((val) => {
                  if (Array.isArray(val)) return undefined
                  return val || undefined
                }),
            }),
            z.null(),
          ])
          .default({})
          .transform((val) => val || {}),
        basedIn: z
          .union([z.string(), z.array(z.string()), z.null(), z.undefined()])
          .transform((val) => {
            if (val === null || val === undefined || val === "") return [];
            if (Array.isArray(val)) return val.filter((v) => v && v.trim());
            return [val];
          })
          .default([]),
        whyContact: z
          .union([z.string(), z.array(z.string()), z.array(z.any()), z.null(), z.undefined()])
          .transform((val) => {
            if (val === null || val === undefined) return ['Potential wealth management opportunity']
            if (Array.isArray(val)) {
              const strings = val.filter(v => typeof v === 'string' && v.trim())
              return strings.length > 0 ? strings : ['Potential wealth management opportunity']
            }
            if (typeof val === 'string' && val.trim()) return [val]
            return ['Potential wealth management opportunity']
          })
          .pipe(
            z
              .array(z.string())
              .min(1, "whyContact must have at least one reason"),
          ),
        lastKnownEventLiquidityMM: z
          .union([z.number(), z.string(), z.null(), z.undefined()])
          .transform((val) => {
            if (val === null || val === undefined) return null;
            if (typeof val === "number") return val;
            if (typeof val === "string") {
              const parsed = parseFloat(val);
              return isNaN(parsed) ? null : parsed;
            }
            return null;
          })
          .pipe(z.number().nullable()),
        // PHASE 1: Access path
        accessPath: accessPathSchema.optional(),
        // PHASE 1: Liquidity event with timing
        liquidityEvent: liquidityEventSchema.nullable().optional(),
        // PHASE 1: Priority
        priority: z.enum(PRIORITY_LEVELS).default("medium"),
        // PHASE 1: Follow-up date
        followUpDate: z.string().nullable().optional(),
        event_key: z.string().optional(),
        profile: profileSchema.optional(),
        // PHASE 2: Predictive scoring
        likelyToTransactInMonths: z
          .union([z.number(), z.string(), z.null(), z.undefined()])
          .transform((val) => {
            if (val === null || val === undefined) return null
            if (typeof val === 'number') return val
            const parsed = parseInt(val, 10)
            return isNaN(parsed) ? null : parsed
          })
          .pipe(z.number().nullable().optional()),
        transactionReadiness: z.enum(['cold', 'warm', 'hot', 'urgent']).nullable().optional(),
        dealSignalSources: z.array(z.string()).default([]),
        relatedIndividuals: z
          .array(
            z.object({
              name: z.string(),
              relationship: z.string().nullable().optional(),
              role: z.string().nullable().optional(),
              company: z.string().nullable().optional(),
              type: z.string().nullable().optional(),
              notes: z.string().nullable().optional(),
              linkedOppId: z.string().nullable().optional(),
            }),
          )
          .optional(),
      })
      .passthrough(),
  ), z.null()]).transform(val => val === null ? [] : val),
});
