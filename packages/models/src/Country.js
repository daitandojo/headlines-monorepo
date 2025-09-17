// packages/models/src/Country.js (version 4.0.0 - Self-Contained)
import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;
const CountrySchema = new Schema({ name: { type: String, required: true, unique: true, trim: true, }, isoCode: { type: String, required: true, unique: true, trim: true, uppercase: true, minlength: 2, maxlength: 2, }, status: { type: String, enum: ['active', 'inactive'], default: 'active', required: true, index: true, }, }, { timestamps: true, collection: 'countries', });
export default models.Country || model('Country', CountrySchema);
