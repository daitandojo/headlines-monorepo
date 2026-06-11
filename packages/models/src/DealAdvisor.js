import mongoose from 'mongoose'
const { Schema, model, models } = mongoose

const DealAdvisorSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    type: {
      type: String,
      required: true,
      enum: ['legal', 'financial', 'accounting', 'strategic', 'pr', 'consulting', 'other'],
      index: true,
    },
    role: {
      type: String,
      enum: [
        'sell_side_advisor', 'buy_side_advisor', 'legal_counsel_buyer',
        'legal_counsel_seller', 'auditor', 'placement_agent', 'financial_advisor',
        'lead_arranger', 'due_diligence', 'tax_advisor', 'other',
      ],
      index: true,
    },
    firmType: { type: String, enum: ['investment_bank', 'law_firm', 'consulting', 'accounting', 'boutique', 'other'] },
    dealId: { type: Schema.Types.ObjectId, ref: 'SynthesizedEvent' },
    dealValueUSD_MM: { type: Number },
    dealName: { type: String, trim: true },
    partiesInvolved: [{ type: String, trim: true }],
    activeJurisdictions: [{ type: String, trim: true }],
    dealCount: { type: Number, default: 1 },
    lastDealDate: { type: Date },
  },
  {
    timestamps: true,
    collection: 'deal_advisors',
  }
)

DealAdvisorSchema.index({ name: 1, type: 1 }, { unique: true })

export default models.DealAdvisor || model('DealAdvisor', DealAdvisorSchema)