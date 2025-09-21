// packages/models/src/Subscriber.js (version 5.0.1 - Complete)
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { SUBSCRIBER_ROLES, SUBSCRIPTION_TIERS } from './constants.js'
const { Schema, model, models } = mongoose
const SALT_WORK_FACTOR = 10

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

SubscriberSchema.pre('save', function (next) {
  const user = this
  if (!user.isModified('password')) return next()

  bcrypt.genSalt(SALT_WORK_FACTOR, function (err, salt) {
    if (err) return next(err)
    bcrypt.hash(user.password, salt, function (err, hash) {
      if (err) return next(err)
      user.password = hash
      next()
    })
  })
})

SubscriberSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password)
}

export default models.Subscriber || model('Subscriber', SubscriberSchema)
