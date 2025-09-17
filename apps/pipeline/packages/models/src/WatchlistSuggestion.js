// packages/models/src/WatchlistSuggestion.js (version 3.0.0 - With Search Terms)
import mongoose from 'mongoose'
import { WATCHLIST_SUGGESTION_STATUSES, ENTITY_TYPES } from './constants.js'
const { Schema, model, models } = mongoose;

const WatchlistSuggestionSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true, index: true },
    type: { type: String, enum: ENTITY_TYPES, required: true, index: true },
    rationale: { type: String, trim: true, required: true },
    sourceEvent: { type: String, required: true },
    country: { type: String, trim: true, required: false },
    searchTerms: { type: [String], default: [] }, // NEW FIELD
    status: {
      type: String,
      enum: WATCHLIST_SUGGESTION_STATUSES,
      default: 'candidate',
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'watchlist_suggestions',
  }
)

export default models.WatchlistSuggestion || model('WatchlistSuggestion', WatchlistSuggestionSchema)
