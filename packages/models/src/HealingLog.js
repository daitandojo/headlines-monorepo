// packages/models/src/HealingLog.js
import mongoose from 'mongoose'
const { Schema, model, models } = mongoose

const HealingLogSchema = new Schema(
  {
    runId: { type: String, required: true, index: true },
    action: {
      type: String,
      required: true,
      enum: ['pause_source', 'reactivate_source', 'swap_model', 'reduce_concurrency', 'alert', 'selector_repair'],
    },
    targetType: { type: String, enum: ['source', 'model', 'concurrency', 'general'] },
    targetName: { type: String },
    reason: { type: String, trim: true },
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
    before: { type: Schema.Types.Mixed },
    after: { type: Schema.Types.Mixed },
    success: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'healing_logs' }
)

HealingLogSchema.index({ createdAt: -1 })
HealingLogSchema.index({ targetName: 1, createdAt: -1 })

export default models.HealingLog || model('HealingLog', HealingLogSchema)