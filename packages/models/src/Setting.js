// packages/models/src/Setting.js (version 5.0.0)
import mongoose from 'mongoose'
const { Schema, model, models } = mongoose

const SETTING_KEYS = [
  'HEADLINES_RELEVANCE_THRESHOLD',
  'ARTICLES_RELEVANCE_THRESHOLD',
  'EVENT_RELEVANCE_THRESHOLD',
  'MINIMUM_EVENT_AMOUNT_USD_MILLIONS',
  'HIGH_SIGNAL_HEADLINE_THRESHOLD',
  'AGENT_DISAGREEMENT_THRESHOLD',
  'SINGLETON_RELEVANCE_THRESHOLD',
  'HIGH_VALUE_DEAL_USD_MM',
  'SIGNIFICANT_PRIVATE_BENEFICIARY_USD_MM',
  'WATCHLIST_SCORE_BOOST',
  'SUGGESTION_GENERATION_THRESHOLD',
  'MIN_ARTICLE_CHARS',
  'LLM_MODEL_HEADLINE_ASSESSMENT',
  'LLM_MODEL_ARTICLE_ASSESSMENT',
  'LLM_MODEL_SYNTHESIS',
  'LLM_MODEL_UTILITY',
]

const SettingSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, index: true, enum: SETTING_KEYS },
    value: { type: Schema.Types.Mixed, required: true },
    description: { type: String, required: false, trim: true },
    type: {
      type: String,
      required: true,
      enum: ['number', 'boolean', 'string'],
      default: 'number',
    },
  },
  { timestamps: true, collection: 'settings' }
)

export default models.Setting || model('Setting', SettingSchema)
