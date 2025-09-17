// packages/models/src/RunVerdict.js (version 4.0.0 - Self-Contained)
import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;
const RunVerdictSchema = new Schema({ runStats: { type: Schema.Types.Mixed, required: true, }, judgeVerdict: { type: Schema.Types.Mixed, required: false, default: {}, }, generatedEvents: [{ type: Schema.Types.ObjectId, ref: 'SynthesizedEvent', }], generatedOpportunities: [{ type: Schema.Types.ObjectId, ref: 'Opportunity', }], duration_seconds: { type: Number, required: true, }, cost_summary: { type: Schema.Types.Mixed, required: false, }, }, { timestamps: true, collection: 'run_verdicts', });
RunVerdictSchema.index({ createdAt: -1 });
export default models.RunVerdict || model('RunVerdict', RunVerdictSchema);
