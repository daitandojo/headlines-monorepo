// packages/models/src/SynthesizedEvent.js (version 8.0.2)
import mongoose from 'mongoose'
const { Schema, model, models } = mongoose

const SourceArticleSchema = new Schema(
  {
    headline: { type: String, required: true, trim: true },
    link: { type: String, required: true, trim: true },
    newspaper: { type: String, required: true, trim: true },
    imageUrl: { type: String, trim: true },
  },
  { _id: false }
)

const KeyIndividualSchema = new Schema(
  {
    name: { type: String, trim: true },
    role_in_event: { type: String, trim: true },
    company: { type: String, trim: true },
    email_suggestion: { type: String, trim: true },
  },
  { _id: false }
)

const SynthesizedEventSchema = new Schema(
  {
    event_key: { type: String, required: true, unique: true, trim: true, index: true },
    synthesized_headline: { type: String, required: true, trim: true },
    synthesized_summary: { type: String, required: true, trim: true },
    advisorSummary: { type: String, trim: true },
    ai_assessment_reason: { type: String, trim: true },
    eventClassification: { type: String, trim: true },
    country: { type: String, required: true, index: true },
    source_articles: { type: [SourceArticleSchema], required: true },
    highest_relevance_score: { type: Number, required: true, min: 0, max: 100 },
    key_individuals: { type: [KeyIndividualSchema], default: [] },
    relatedOpportunities: [
      { type: Schema.Types.ObjectId, ref: 'Opportunity', index: true },
    ],
    enrichmentSources: {
      type: [String],
      enum: ['rag_db', 'wikipedia', 'news_api'],
      default: [],
    },
    emailed: { type: Boolean, default: false },
    email_sent_at: { type: Date },
  },
  {
    timestamps: true,
    collection: 'synthesized_events',
    methods: {
      toRealtimePayload() {
        return {
          _id: this._id,
          synthesized_headline: this.synthesized_headline,
          country: this.country,
          highest_relevance_score: this.highest_relevance_score,
          createdAt: this.createdAt,
        }
      },
    },
  }
)

SynthesizedEventSchema.index({
  synthesized_headline: 'text',
  synthesized_summary: 'text',
})
SynthesizedEventSchema.index({ country: 1, createdAt: -1 })

export default models.SynthesizedEvent ||
  model('SynthesizedEvent', SynthesizedEventSchema)
