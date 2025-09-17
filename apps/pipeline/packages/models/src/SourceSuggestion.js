// packages/models/src/SourceSuggestion.js (version 4.0.0 - Self-Contained)
import mongoose from 'mongoose';
import { SUGGESTION_STATUSES } from './constants.js';
const { Schema, model, models } = mongoose;
const SourceSuggestionSchema = new Schema({ sourceId: { type: Schema.Types.ObjectId, ref: 'Source', required: true, index: true }, sourceName: { type: String, required: true }, failedSelector: { type: String, required: true }, sourceHtmlPath: { type: String, required: false }, suggestedSelectors: { headlineSelector: { type: String }, linkSelector: { type: String }, headlineTextSelector: { type: String }, articleSelector: { type: String }, }, reasoning: { type: String, required: true }, status: { type: String, enum: SUGGESTION_STATUSES, default: 'pending', required: true, index: true, }, }, { timestamps: true, collection: 'source_suggestions', });
export default models.SourceSuggestion || model('SourceSuggestion', SourceSuggestionSchema);
