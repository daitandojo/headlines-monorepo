// packages/models/src/WatchlistEntity.js (version 2.1.0)
import mongoose from 'mongoose'
import { ENTITY_TYPES, ENTITY_STATUSES } from './constants.js'

const { Schema, model, models } = mongoose

const WatchlistEntitySchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true, index: true },
    type: { type: String, enum: ENTITY_TYPES, required: true, index: true },
    status: {
      type: String,
      enum: ENTITY_STATUSES,
      default: 'candidate',
      required: true,
      index: true,
    },
    context: { type: String, trim: true, required: false },
    searchTerms: { type: [String], default: [], index: true },
    country: { type: String, trim: true, required: false, index: true },
    hitCount: { type: Number, default: 0, index: true },
    estimatedNetWorthUSD_MM: { type: Number, required: false },
    primaryCompany: { type: String, trim: true, required: false },
    notes: { type: String, trim: true, required: false },
  },
  {
    timestamps: true,
    collection: 'watchlist_entities',
  }
)

export default models.WatchlistEntity || model('WatchlistEntity', WatchlistEntitySchema)
