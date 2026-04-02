// packages/models/src/Subscriber.js
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { SUBSCRIBER_ROLES, SUBSCRIPTION_TIERS } from "./prompt-constants.js";
const { Schema, model, models } = mongoose;

const CountrySubscriptionSchema = new Schema(
  {
    name: { type: String, required: true },
    active: { type: Boolean, default: true, required: true },
  },
  { _id: false },
);

const InteractionSchema = new Schema(
  {
    articles: [{ type: Schema.Types.ObjectId, ref: "Article" }],
    events: [{ type: Schema.Types.ObjectId, ref: "SynthesizedEvent" }],
    opportunities: [{ type: Schema.Types.ObjectId, ref: "Opportunity" }],
  },
  { _id: false },
);

const FilterPreferencesSchema = new Schema(
  {
    globalCountryFilter: { type: [String], default: [] },
  },
  { _id: false },
);

// Password reset schema
const PasswordResetSchema = new Schema(
  {
    token: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { _id: false },
);

// Activity log schema for EPIC3
const ActivityLogEntrySchema = new Schema(
  {
    action: {
      type: String,
      enum: ["view", "favorite", "discard", "share", "export"],
      required: true,
    },
    itemType: {
      type: String,
      enum: ["article", "event", "opportunity"],
      required: true,
    },
    itemId: { type: Schema.Types.ObjectId, required: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: false },
);

// Profile preferences schema for EPIC3
const ProfilePreferencesSchema = new Schema(
  {
    timezone: { type: String, default: "Europe/Copenhagen" },
    notificationFrequency: {
      type: String,
      enum: ["realtime", "daily", "weekly"],
      default: "daily",
    },
    emailFormat: { type: String, enum: ["html", "text"], default: "html" },
  },
  { _id: false },
);

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
    language: { type: String, required: true, default: "English" },
    countries: { type: [CountrySubscriptionSchema], default: [] },
    sectors: { type: [String], default: [], index: true }, // ADDED
    role: {
      type: String,
      enum: SUBSCRIBER_ROLES,
      default: "user",
      required: true,
    },
    emailNotificationsEnabled: { type: Boolean, default: true },
    pushNotificationsEnabled: { type: Boolean, default: true },
    subscriptionTier: {
      type: String,
      enum: SUBSCRIPTION_TIERS,
      default: "free",
    },
    subscriptionExpiresAt: { type: Date, default: null },
    isLifetimeFree: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true, index: true },
    lastLoginAt: { type: Date, default: null },
    discardedItems: { type: InteractionSchema, default: () => ({}) },
    favoritedItems: { type: InteractionSchema, default: () => ({}) },
    filterPreferences: { type: FilterPreferencesSchema, default: () => ({}) },
    emailSentCount: { type: Number, default: 0 },
    eventsReceivedCount: { type: Number, default: 0 },

    // Security fields for EPIC1
    refreshToken: { type: String, select: false, default: null },
    refreshTokenExpiresAt: { type: Date, default: null },
    passwordReset: { type: PasswordResetSchema, default: null },
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String, select: false, default: null },
    loginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },

    // EPIC3: Feature Expansion
    profile: { type: ProfilePreferencesSchema, default: () => ({}) },
    activityLog: { type: [ActivityLogEntrySchema], default: [] },
    unreadItems: {
      type: Map,
      of: [Schema.Types.ObjectId],
      default: () => new Map(),
    },
  },
  { timestamps: true, collection: "subscribers" },
);

SubscriberSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

export default models.Subscriber || model("Subscriber", SubscriberSchema);
