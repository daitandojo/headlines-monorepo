import mongoose from 'mongoose'
const { Schema, model, models } = mongoose

const FamilyOfficeSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true, index: true },
    aliases: [{ type: String, trim: true }],
    investmentType: {
      type: String,
      enum: ['single_family', 'multi_family', 'virtual', 'embedded', 'unknown'],
      default: 'unknown',
      index: true,
    },
    location: { type: String, trim: true },
    country: { type: String, trim: true, index: true },
    estimatedAUM_USD_MM: { type: Number },
    knownClients: [{ type: Schema.Types.ObjectId, ref: 'Opportunity' }],
    clientNames: [{ type: String, trim: true }],
    officers: [
      {
        name: { type: String, trim: true },
        title: { type: String, trim: true },
        email: { type: String, trim: true },
        linkedIn: { type: String, trim: true },
      },
    ],
    investmentFocus: [{ type: String, trim: true }],
    minCheckSize_USD_MM: { type: Number },
    maxCheckSize_USD_MM: { type: Number },
    preferredGeography: [{ type: String, trim: true }],
    preferredSectors: [{ type: String, trim: true }],
    knownAdvisors: [{ type: String, trim: true }], // names of legal/financial firms
    website: { type: String, trim: true },
    source: { type: String, trim: true },
    discoveryEventId: { type: Schema.Types.ObjectId, ref: 'SynthesizedEvent' },
    lastSeenDate: { type: Date },
    confidence: {
      type: String,
      enum: ['confirmed', 'probable', 'possible'],
      default: 'possible',
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'family_offices',
  }
)

FamilyOfficeSchema.index({ country: 1, investmentType: 1 })
FamilyOfficeSchema.index({ investmentFocus: 1 })
FamilyOfficeSchema.index({ estimatedAUM_USD_MM: -1 })

export default models.FamilyOffice || model('FamilyOffice', FamilyOfficeSchema)