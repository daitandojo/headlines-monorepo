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
    // ADDED: Field for AI-assessed dossier quality.
    dossierQuality: {
      type: String,
      enum: ['bronze', 'silver', 'gold'],
      default: 'bronze',
    },
  },
  { _id: false }
)

const OpportunitySchema = new Schema(
  {
    reachOutTo: { type: String, required: true, trim: true, unique: true, index: true },
    contactDetails: { type: ContactDetailsSchema },
    basedIn: { type: [String], trim: true, index: true },
    city: { type: String, trim: true, required: false },
    whyContact: { type: [String], required: true },
    lastKnownEventLiquidityMM: { type: Number, required: true, default: 0 },
    profile: { type: ProfileSchema, required: false },
    embedding: { type: [Number] },
    events: [{ type: Schema.Types.ObjectId, ref: 'SynthesizedEvent', index: true }],
    relatedOpportunities: [{ type: Schema.Types.ObjectId, ref: 'Opportunity' }],
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