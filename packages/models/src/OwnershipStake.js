import mongoose from 'mongoose'
const { Schema, model, models } = mongoose

const OwnershipStakeSchema = new Schema(
  {
    entityName: { type: String, required: true, trim: true, index: true },
    entityId: { type: Schema.Types.ObjectId, ref: 'EntityGraph', index: true },
    companyName: { type: String, required: true, trim: true, index: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'EntityGraph', index: true },
    percentage: { type: Number },
    shareClass: { type: String, enum: ['common', 'preferred', 'founder', 'ordinary', 'other'], default: 'common' },
    estimatedValueUSD_MM: { type: Number },
    verifiedDate: { type: Date },
    source: { type: String, trim: true },
    sourceUrl: { type: String, trim: true },
    sourceArticleId: { type: Schema.Types.ObjectId, ref: 'Article' },
    stakeType: {
      type: String,
      enum: ['direct', 'trust', 'spv', 'nominee', 'through_holding_company', 'through_family_office', 'other'],
      default: 'direct',
    },
    isVerified: { type: Boolean, default: false },
    confidence: { type: Number, min: 0, max: 100, default: 50 },
  },
  {
    timestamps: true,
    collection: 'ownership_stakes',
  }
)

OwnershipStakeSchema.index({ entityName: 1, companyName: 1 }, { unique: true })

export default models.OwnershipStake || model('OwnershipStake', OwnershipStakeSchema)