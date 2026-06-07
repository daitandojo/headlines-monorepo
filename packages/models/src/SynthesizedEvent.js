// packages/models/src/SynthesizedEvent.js
import mongoose from 'mongoose'
const { Schema, model, models } = mongoose

const SourceArticleSchema = new Schema(
  {
    headline: { type: String, required: true, trim: true },
    link: { type: String, required: true, trim: true },
    newspaper: { type: String, required: true, trim: true },
    imageUrl: { type: String, trim: true },
    // --- START OF DEFINITIVE FIX ---
    // The country field must be an array of strings to match the main Article schema.
    country: { type: [String], trim: true },
    // --- END OF DEFINITIVE FIX ---
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

const TransactionDetailsSchema = new Schema(
  {
    transactionType: { type: String, trim: true },
    valuationAtEventUSD: { type: Number },
    ownershipPercentageChange: { type: Number },
    liquidityFlow: {
      from: { type: String, trim: true },
      to: { type: String, trim: true },
      approxAmountUSD: { type: Number },
      nature: { type: String, trim: true },
    },
    // PHASE 1: UBO drill-down
    sellerUBOs: {
      type: [
        {
          name: { type: String, required: true },
          role: { type: String, trim: true },
          company: { type: String, trim: true },
          estimatedProceedsMM: { type: Number },
        },
      ],
      default: [],
    },
    buyerUBOs: {
      type: [
        {
          name: { type: String, required: true },
          role: { type: String, trim: true },
          firm: { type: String, trim: true },
        },
      ],
      default: [],
    },
  },
  { _id: false }
)

const SuccessionSignalsSchema = new Schema(
  {
    founderAgeOver65: { type: Boolean },
    externalCEOAppointed: { type: Boolean },
    peMinorityStake: { type: Boolean },
    namedHeirApparent: { type: String, trim: true },
    score: { type: Number, default: 0 },
  },
  { _id: false }
)

const PrimarySubjectSchema = new Schema(
  {
    name: { type: String, trim: true },
    role: { type: String, trim: true },
  },
  { _id: false }
)

const LifecycleEventSchema = new Schema(
  {
    stage: { type: String, required: true },
    status: { type: String, required: true },
    reason: { type: String },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
)

const JudgeVerdictSchema = new Schema(
  {
    quality: { type: String, required: true },
    commentary: { type: String, required: true },
  },
  { _id: false }
)

const PreDealSignalSchema = new Schema(
  {
    signal: { type: String, trim: true },
    confidence: { type: Number, min: 0, max: 100 },
    source: { type: String, trim: true },
  },
  { _id: false }
)

const CompanyFinancialsSchema = new Schema(
  {
    revenueMM: { type: Number },
    profitMM: { type: Number },
    debtMM: { type: Number },
    revenueGrowthPercent: { type: Number },
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
    country: { type: [String], required: true, index: true },
    source_articles: { type: [SourceArticleSchema], required: true },
    highest_relevance_score: { type: Number, required: true, min: 0, max: 100 },
    key_individuals: { type: [KeyIndividualSchema], default: [] },
    relatedOpportunities: [
      { type: Schema.Types.ObjectId, ref: 'Opportunity', index: true },
    ],
    enrichmentSources: {
      type: [String],
      enum: ['rag_db', 'wikipedia', 'news_api', 'knowledge_graph'],
      default: [],
    },
    emailed: { type: Boolean, default: false },
    email_sent_at: { type: Date },
    transactionDetails: { type: TransactionDetailsSchema, required: false },
    primarySubject: { type: PrimarySubjectSchema, required: false },
    relatedCompanies: { type: [String], default: [] },
    tags: { type: [String], default: [], index: true },
    ingested: { type: Boolean, default: false },
    eventStatus: {
      type: String,
      enum: ['Completed', 'Pending', 'Rumored', 'Other'],
      default: 'Completed',
    },
    // PHASE 1: Trigger classification + succession signals
    triggerClass: {
      type: String,
      enum: [
        'TC1_FAMILY_FOUNDER', 'TC2_MA_BUYER', 'TC3_MA_SELLER',
        'TC4_PRIVATE_EQUITY', 'TC5_LISTED_COMPANY', 'TC6_REAL_ESTATE',
        'TC7_PHILANTHROPY', 'TC8_SUCCESSION', 'TC9_IPO', 'TC10_LUXURY_ASSET',
      ],
    },
    successionSignals: { type: SuccessionSignalsSchema },
    dealCloseDate: { type: String, trim: true },
    dealStatus: {
      type: String,
      enum: ['rumor', 'announced', 'pending', 'completed', 'cancelled'],
    },
    preDealSignals: { type: [PreDealSignalSchema], default: [] },
    companyFinancials: { type: CompanyFinancialsSchema },
    judgeVerdict: { type: JudgeVerdictSchema, required: false, select: false },
    pipelineTrace: { type: [LifecycleEventSchema], default: [], select: false },
    watchlistHits: [
      {
        type: Schema.Types.ObjectId,
        ref: 'WatchlistEntity',
        index: true,
      },
    ],
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
