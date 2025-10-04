// packages/models/src/Opportunity.js (version 9.1.0 - Multi-country support)
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

const OpportunitySchema = new Schema(
  {
    reachOutTo: { type: String, required: true, trim: true, unique: true, index: true },
    contactDetails: { type: ContactDetailsSchema },
    basedIn: { type: [String], trim: true, index: true }, // MODIFIED: Changed to array of strings
    city: { type: String, trim: true, required: false },
    whyContact: { type: [String], required: true },
    likelyMMDollarWealth: { type: Number, required: true, default: 0 },
    embedding: { type: [Number] },
    events: [{ type: Schema.Types.ObjectId, ref: 'SynthesizedEvent', index: true }],
    relatedOpportunities: [{ type: Schema.Types.ObjectId, ref: 'Opportunity' }],
  },
  { timestamps: true, collection: 'opportunities' }
)

export default models.Opportunity || model('Opportunity', OpportunitySchema)
