// packages/models/src/Article.js (version 2.0.2)
import mongoose from 'mongoose'
import { ARTICLE_STATUSES } from './prompt-constants.js'

const { Schema, model, models } = mongoose

const LifecycleEventSchema = new Schema(
  {
    stage: { type: String, required: true },
    status: { type: String, required: true },
    reason: { type: String },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
)

const ArticleSchema = new Schema(
  {
    headline: { type: String, required: true, trim: true, minlength: 5, maxlength: 500 },
    headline_en: { type: String, trim: true },
    link: { type: String, required: true, unique: true, trim: true },
    newspaper: { type: String, required: true, trim: true },
    source: { type: String, required: true, trim: true },
    country: { type: String, trim: true, index: true },
    imageUrl: { type: String, trim: true },
    relevance_headline: { type: Number, required: true, min: 0, max: 100 },
    assessment_headline: { type: String, required: true, trim: true },
    articleContent: {
      type: { contents: { type: [String], default: [] } },
      required: false,
      select: false,
    },
    relevance_article: { type: Number, min: 0, max: 100 },
    assessment_article: { type: String, trim: true },
    key_individuals: [
      {
        _id: false,
        name: String,
        role_in_event: String,
        company: String,
        email_suggestion: String,
      },
    ],
    enrichment_error: { type: String, trim: true },
    emailed: { type: Boolean, default: false },
    embedding: { type: [Number], select: false },
    synthesizedEventId: {
      type: Schema.Types.ObjectId,
      ref: 'SynthesizedEvent',
      index: true,
      required: false,
    },
    status: { type: String, enum: ARTICLE_STATUSES, default: 'scraped', index: true },
    pipeline_lifecycle: { type: [LifecycleEventSchema], default: [] },
  },
  {
    timestamps: true,
    collection: 'articles',
    methods: {
      toRealtimePayload() {
        return {
          _id: this._id,
          headline: this.headline,
          headline_en: this.headline_en,
          link: this.link,
          newspaper: this.newspaper,
          country: this.country,
          relevance_article: this.relevance_article,
          createdAt: this.createdAt,
        }
      },
    },
  }
)

ArticleSchema.index({ headline: 'text', headline_en: 'text', assessment_article: 'text' })

export default models.Article || model('Article', ArticleSchema)
