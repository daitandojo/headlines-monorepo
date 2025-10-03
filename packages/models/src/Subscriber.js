// packages/models/src/Subscriber.js
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { SUBSCRIBER_ROLES, SUBSCRIPTION_TIERS } from './prompt-constants.js'
const { Schema, model, models } = mongoose

const CountrySubscriptionSchema = new Schema(
  {
    name: { type: String, required: true },
    active: { type: Boolean, default: true, required: true },
  },
  { _id: false }
)

const InteractionSchema = new Schema(
  {
    articles: [{ type: Schema.Types.ObjectId, ref: 'Article' }],
    events: [{ type: Schema.Types.ObjectId, ref: 'SynthesizedEvent' }],
    opportunities: [{ type: Schema.Types.ObjectId, ref: 'Opportunity' }],
  },
  { _id: false }
)

const FilterPreferencesSchema = new Schema(
  {
    globalCountryFilter: { type: [String], default: [] },
  },
  { _id: false }
)

const SubscriberSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    password: { type: String, required: true, select: false },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: false, trim: true },
    language: { type: String, required: true, default: 'English' },
    countries: { type: [CountrySubscriptionSchema], default: [] },
    role: { type: String, enum: SUBSCRIBER_ROLES, default: 'user', required: true },
    emailNotificationsEnabled: { type: Boolean, default: true },
    pushNotificationsEnabled: { type: Boolean, default: true },
    subscriptionTier: { type: String, enum: SUBSCRIPTION_TIERS, default: 'free' },
    subscriptionExpiresAt: { type: Date, default: null },
    isLifetimeFree: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true, index: true },
    lastLoginAt: { type: Date, default: null },
    discardedItems: { type: InteractionSchema, default: () => ({}) },
    favoritedItems: { type: InteractionSchema, default: () => ({}) },
    filterPreferences: { type: FilterPreferencesSchema, default: () => ({}) },
    emailSentCount: { type: Number, default: 0 },
    eventsReceivedCount: { type: Number, default: 0 },
  },
  { timestamps: true, collection: 'subscribers' }
)

// The pre('save') hook for password hashing has been REMOVED.
// Hashing is now handled explicitly in the data-access layer.

SubscriberSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password)
}

export default models.Subscriber || model('Subscriber', SubscriberSchema)
