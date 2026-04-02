// packages/models/src/Source.js
import mongoose from "mongoose";
import {
  SOURCE_STATUSES,
  SOURCE_FREQUENCIES,
  EXTRACTION_METHODS,
} from "./prompt-constants.js";
const { Schema, model, models } = mongoose;

const SourceAnalyticsSchema = new Schema(
  {
    totalRuns: { type: Number, default: 0 },
    totalSuccesses: { type: Number, default: 0 },
    totalFailures: { type: Number, default: 0 },
    totalScraped: { type: Number, default: 0 },
    totalRelevant: { type: Number, default: 0 },
    lastRunHeadlineCount: { type: Number, default: 0 },
    lastRunRelevantCount: { type: Number, default: 0 },
    lastRunContentSuccess: { type: Boolean, default: false },
  },
  { _id: false },
);

const SourceSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    baseUrl: { type: String, required: true, trim: true },
    sectionUrl: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true, index: true },
    language: { type: String, required: true, trim: true, default: "en" },
    status: {
      type: String,
      enum: SOURCE_STATUSES,
      default: "active",
      required: true,
      index: true,
    },
    scrapeFrequency: {
      type: String,
      enum: SOURCE_FREQUENCIES,
      default: "high",
      required: true,
    },
    extractionMethod: {
      type: String,
      enum: EXTRACTION_METHODS,
      required: true,
      default: "declarative",
    },
    // --- START OF FIX ---
    // Add the missing extractorKey field.
    extractorKey: { type: String, required: false, trim: true, default: null },
    // --- END OF FIX ---

    // API-specific fields for API-based sources
    apiEndpoint: { type: String, required: false, trim: true, default: null },
    apiKey: { type: String, required: false, trim: true, default: null },
    apiResponseMapping: {
      itemsPath: { type: String, required: false, default: null },
      headlineField: { type: String, required: false, default: "title" },
      summaryField: { type: String, required: false, default: "summary" },
      urlField: { type: String, required: false, default: "url" },
      dateField: { type: String, required: false, default: "publishedAt" },
      sourceField: { type: String, required: false, default: "source" },
    },

    headlineSelector: { type: [String], required: false, default: [] },
    linkSelector: { type: String, required: false, trim: true },
    headlineTextSelector: { type: String, required: false, trim: true },
    articleSelector: { type: [String], required: false, default: [] },
    lastScrapedAt: { type: Date, required: false, index: true },
    lastSuccessAt: { type: Date, required: false },
    notes: { type: String, required: false, trim: true },
    analytics: { type: SourceAnalyticsSchema, default: () => ({}) },
  },
  { timestamps: true, collection: "sources" },
);

SourceSchema.index({ status: 1, scrapeFrequency: 1, lastScrapedAt: 1 });

export default models.Source || model("Source", SourceSchema);
