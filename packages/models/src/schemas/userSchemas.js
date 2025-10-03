// packages/models/src/schemas/userSchemas.js
import { z } from 'zod'
import { SUBSCRIBER_ROLES, SUBSCRIPTION_TIERS } from '../prompt-constants.js'

const countrySubscriptionSchema = z.object({
  name: z.string(),
  active: z.boolean(),
})

export const userCreateSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().optional(),
  language: z.string().default('English'),
  countries: z.array(countrySubscriptionSchema).default([]),
  role: z.enum(SUBSCRIBER_ROLES).default('user'),
  emailNotificationsEnabled: z.boolean().default(true),
  pushNotificationsEnabled: z.boolean().default(true),
  subscriptionTier: z.enum(SUBSCRIPTION_TIERS).default('free'),
  isActive: z.boolean().default(true),
})

export const userUpdateSchema = userCreateSchema
  .omit({ email: true }) // Email cannot be changed on update
  .partial() // All fields are optional on update
  .extend({
    // Allow password to be an empty string for "no change"
    password: z
      .string()
      .min(6, 'Password must be at least 6 characters')
      .or(z.literal(''))
      .optional(),
  })

export const signupSchema = z.object({
  name: z.string().min(1, 'Full name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  countries: z.array(z.string()).default([]),
  plan: z.enum(['trial', 'paid']).default('trial'),
})
