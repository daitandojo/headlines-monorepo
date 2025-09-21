// packages/models/src/SourceSuggestion.js (version 5.0.0)
import mongoose from 'mongoose'
import { SUGGESTION_STATUSES } from './constants.js'
const { Schema, model, models } = mongoose

const SourceSuggestionSchema = new Schema(
  {
    sourceId: { type: Schema.Types.ObjectId, ref: 'Source', required: true, index: true },
    sourceName: { type: String, required: true, trim: true },
    failedSelector: { type: String, required: true, trim: true },
    suggestedSelectors: {
      headlineSelector: String,
      linkSelector: String,
      headlineTextSelector: String,
      articleSelector: String,
    },
    reasoning: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: SUGGESTION_STATUSES,
      default: 'pending',
      required: true,
      index: true,
    },
  },
  { timestamps: true, collection: 'source_suggestions' }
)

export default models.SourceSuggestion ||
  model('SourceSuggestion', SourceSuggestionSchema)
