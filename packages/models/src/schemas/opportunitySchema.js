// packages/models/src/schemas/opportunitySchema.js
import { z } from 'zod'

// This is the definitive, unified schema for a rich dossier.
const profileSchema = z
  .object({
    profilePhotoUrl: z.string().url().nullable().optional(),
    yearOfBirth: z.number().nullable().optional(),
    biography: z.string().nullable().optional(),
    estimatedNetWorthMM: z.number().default(0),
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
    dossierQuality: z.enum(['bronze', 'silver', 'gold']).default('bronze'),
  })
  .passthrough() // Use passthrough to be more robust against extra fields from the AI

export const opportunitySchema = z.object({
  opportunities: z.array(
    z
      .object({
        reachOutTo: z.string().min(1, 'reachOutTo cannot be empty'),
        contactDetails: z
          .object({
            email: z
              .string()
              .email()
              .nullable()
              .optional()
              .or(z.literal(''))
              .transform((val) => val || undefined),
            role: z
              .string()
              .nullable()
              .optional()
              .transform((val) => val || undefined),
            company: z
              .string()
              .nullable()
              .optional()
              .transform((val) => val || undefined),
          })
          .default({}),
        basedIn: z
          .union([z.string(), z.array(z.string()), z.null(), z.undefined()])
          .transform((val) => {
            if (val === null || val === undefined || val === '') return []
            if (Array.isArray(val)) return val.filter((v) => v && v.trim())
            return [val]
          })
          .default([]),
        whyContact: z
          .union([z.string(), z.array(z.string())])
          .nullable()
          .transform((val) => {
            if (val === null || val === undefined) return []
            if (Array.isArray(val)) return val
            if (typeof val === 'string' && val.trim()) return [val]
            return []
          })
          .pipe(z.array(z.string()).min(1, 'whyContact must have at least one reason')),
        lastKnownEventLiquidityMM: z
          .union([z.number(), z.string(), z.null(), z.undefined()])
          .transform((val) => {
            if (val === null || val === undefined) return null
            if (typeof val === 'number') return val
            if (typeof val === 'string') {
              const parsed = parseFloat(val)
              return isNaN(parsed) ? null : parsed
            }
            return null
          })
          .pipe(z.number().nullable()),
        event_key: z.string().optional(), // Make optional as oppFactory doesn't have an event key
        profile: profileSchema.optional(),
      })
      .passthrough() // Use passthrough on the main object as well
  ),
})
