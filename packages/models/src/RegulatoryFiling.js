import mongoose from 'mongoose'
const { Schema, model, models } = mongoose

const RegulatoryFilingSchema = new Schema(
  {
    filingId: { type: String, required: true, unique: true, trim: true, index: true },
    filingType: {
      type: String,
      required: true,
      enum: [
        '13D', '13G', '13D/A', '13G/A', '8-K', 'Form 4', 'SC 13D', 'SC 13G',
        'DIRECTOR_APPOINTMENT', 'SHARE_TRANSFER', 'CHARGE', 'INSOLVENCY',
        'ANNUAL_RETURN', 'PSC_REGISTER', 'CONFIRMATION_STATEMENT',
        'INCUMBENCY', 'OTHER',
      ],
      index: true,
    },
    companyName: { type: String, required: true, trim: true, index: true },
    companyIdentifier: { type: String, trim: true },
    jurisdiction: {
      type: String,
      required: true,
      enum: ['us_sec', 'uk_companies_house', 'dk_cvr', 'eu_register', 'other'],
      index: true,
    },
    filingDate: { type: Date, required: true, index: true },
    subjects: [{ type: String, trim: true }],
    rawText: { type: String, select: false },
    aiSummary: { type: String, trim: true },
    extractedTransaction: {
      type: {
        type: { type: String, enum: ['share_purchase', 'asset_sale', 'merger', 'board_change', 'ownership_change', 'fundraising', 'other'] },
        amountUSD_MM: { type: Number },
        parties: [{ name: { type: String }, role: { type: String } }],
        ownershipChangePercent: { type: Number },
      },
    },
    sourceUrl: { type: String, trim: true },
    processedAt: { type: Date },
    linkedEntities: [{ type: Schema.Types.ObjectId, ref: 'EntityGraph' }],
    linkedOpportunities: [{ type: Schema.Types.ObjectId, ref: 'Opportunity' }],
    linkedEvent: { type: Schema.Types.ObjectId, ref: 'SynthesizedEvent' },
  },
  {
    timestamps: true,
    collection: 'regulatory_filings',
  }
)

RegulatoryFilingSchema.index({ companyIdentifier: 1, filingType: 1 })
RegulatoryFilingSchema.index({ subjects: 1 })
RegulatoryFilingSchema.index({ filingDate: -1 })

export default models.RegulatoryFiling || model('RegulatoryFiling', RegulatoryFilingSchema)