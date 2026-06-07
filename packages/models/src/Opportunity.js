// packages/models/src/Opportunity.js
import mongoose from 'mongoose'
const { Schema, model, models } = mongoose

const ContactDetailsSchema = new Schema(
  {
    email: { type: String, trim: true },
    role: { type: String, trim: true },
    company: { type: String, trim: true },
  },
  { _id: false }
)

const ConduitSchema = new Schema(
  {
    name: { type: String, trim: true },
    role: { type: String, trim: true },
    firm: { type: String, trim: true },
    email: { type: String, trim: true },
    phone: { type: String, trim: true },
    relationship: { type: String, trim: true },
    type: {
      type: String,
      enum: ['pa', 'cfo', 'legal', 'tax', 'trust', 'banker', 'advisor', 'other'],
      trim: true,
    },
  },
  { _id: false }
)

const AccessPathSchema = new Schema(
  {
    familyOffice: { type: String, trim: true },
    primaryContact: {
      name: { type: String, trim: true },
      role: { type: String, trim: true },
      email: { type: String, trim: true },
      phone: { type: String, trim: true },
    },
    conduits: { type: [ConduitSchema], default: [] },
    incumbentWM: { type: String, trim: true },
  },
  { _id: false }
)

const LiquidityEventSchema = new Schema(
  {
    type: {
      type: String,
      enum: [
        'exit_proceeds', 'dividend', 'earnout', 'fundraise', 'ipo_lockup',
        'probate', 'succession', 'management_buyout', 'pe_exit',
        'asset_sale', 'other',
      ],
    },
    description: { type: String, trim: true },
    estimatedAmountMM: { type: Number },
    estimatedCurrency: { type: String, trim: true },
    timingType: { type: String, enum: ['past', 'pending', 'rumored'] },
    estimatedDate: { type: String, trim: true },
    dealCloseDate: { type: String, trim: true },
    source: { type: String, trim: true },
  },
  { _id: false }
)

const ProfileSchema = new Schema(
  {
    profilePhotoUrl: { type: String, trim: true },
    yearOfBirth: { type: Number },
    biography: { type: String, trim: true },
    estimatedNetWorthMM: { type: Number, default: 0 },
    wealthOrigin: { type: String, trim: true },
    familyOffice: {
      name: { type: String, trim: true },
      officer: { type: String, trim: true },
    },
    assetAllocation: { type: String, trim: true },
    investmentInterests: { type: [String], default: [] },
    directInvestments: { type: [String], default: [] },
    philanthropicInterests: { type: [String], default: [] },
    hobbies: { type: [String], default: [] },
    specialInterests: { type: [String], default: [] },
    children: { type: [String], default: [] },
    dossierQuality: {
      type: String,
      enum: ['bronze', 'silver', 'gold'],
      default: 'bronze',
    },
    // PHASE 1: Deep profiling
    assetFootprint: { type: [String], default: [] },
    network: { type: [String], default: [] },
    personalAssistant: { type: String, trim: true },
    taxAdvisor: { type: String, trim: true },
    solicitor: { type: String, trim: true },
    trustCompany: { type: String, trim: true },
    heirsApparent: { type: [String], default: [] },
    liquidityCalendar: { type: String, trim: true },
    painPoints: { type: [String], default: [] },
    opennessSignals: { type: [String], default: [] },
    incumbentBank: { type: String, trim: true },
    primaryResidence: { type: String, trim: true },
    secondaryResidences: { type: [String], default: [] },
    recentRelocation: { type: Boolean },
  },
  { _id: false }
)

const OpportunitySchema = new Schema(
  {
    reachOutTo: { type: String, required: true, trim: true, unique: true, index: true },
    type: { type: String, enum: ['beneficiary', 'conduit'], default: 'beneficiary', index: true },
    triggerClass: {
      type: String,
      enum: [
        'TC1_FAMILY_FOUNDER', 'TC2_MA_BUYER', 'TC3_MA_SELLER',
        'TC4_PRIVATE_EQUITY', 'TC5_LISTED_COMPANY', 'TC6_REAL_ESTATE',
        'TC7_PHILANTHROPY', 'TC8_SUCCESSION', 'TC9_IPO', 'TC10_LUXURY_ASSET',
      ],
    },
    triggerSummary: { type: String, trim: true },
    wealthEstimate: { type: String, trim: true },
    contactDetails: { type: ContactDetailsSchema },
    basedIn: { type: [String], trim: true, index: true },
    city: { type: String, trim: true, required: false },
    whyContact: { type: [String], required: true },
    lastKnownEventLiquidityMM: { type: Number, required: true, default: 0 },
    accessPath: { type: AccessPathSchema },
    liquidityEvent: { type: LiquidityEventSchema },
    priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium', index: true },
    priorityScore: { type: Number, index: true },
    followUpDate: { type: String, trim: true, index: true },
    followUpReason: { type: String, trim: true },
    profile: { type: ProfileSchema, required: false },
    embedding: { type: [Number] },
    events: [{ type: Schema.Types.ObjectId, ref: 'SynthesizedEvent', index: true }],
    relatedOpportunities: [{ type: Schema.Types.ObjectId, ref: 'Opportunity' }],
    // Intelligence upgrade fields
    likelyToTransactInMonths: { type: Number },
    transactionReadiness: {
      type: String,
      enum: ['cold', 'warm', 'hot', 'urgent'],
    },
    dealSignalSources: { type: [String], default: [] },
    pastEvents: [
      {
        eventId: { type: Schema.Types.ObjectId, ref: 'SynthesizedEvent' },
        headline: { type: String, trim: true },
        date: { type: Date },
        type: { type: String, trim: true },
        amountMM: { type: Number },
      },
    ],
    // Sentiment, confidence & decay (Tier 1 Intelligence)
    sentimentTrend: [
      {
        date: { type: Date },
        score: { type: Number, min: -1, max: 1 },
        source: { type: String, trim: true },
      },
    ],
    confidenceScore: { type: Number, min: 0, max: 100, default: 0 },
    lastSignalDate: { type: Date },
    coolingSince: { type: Date },
    corroborationCount: { type: Number, default: 0 },
    // Wealth chain fields
    estimatedTotalWealthUSD_MM: { type: Number },
    ownershipStakesSnapshot: [
      {
        company: { type: String, trim: true },
        percentage: { type: Number },
        estimatedValueUSD_MM: { type: Number },
        stakeType: { type: String },
      },
    ],
    ingested: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    collection: 'opportunities',
    virtuals: {
      likelyMMDollarWealth: {
        get() {
          return this.lastKnownEventLiquidityMM
        },
      },
    },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
)

export default models.Opportunity || model('Opportunity', OpportunitySchema)