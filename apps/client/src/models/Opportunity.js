// src/models/Opportunity.js (version 3.2)
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
    reachOutTo: { type: String, required: true, trim: true },
    contactDetails: { type: ContactDetailsSchema },
    basedIn: { type: String, trim: true },
    whyContact: { type: [String], required: true }, // CORRECTED
    likelyMMDollarWealth: { type: Number, required: true, default: 0 },
    sourceArticleId: {
      type: Schema.Types.ObjectId,
      ref: 'Article',
      required: true,
      index: true,
    },
    sourceEventId: {
      type: Schema.Types.ObjectId,
      ref: 'SynthesizedEvent',
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'opportunities',
  }
)

export default models.Opportunity || model('Opportunity', OpportunitySchema)
