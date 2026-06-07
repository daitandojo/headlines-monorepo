// packages/models/src/EntityGraph.js
import mongoose from 'mongoose'
import { ENTITY_TYPES } from './prompt-constants.js'
const { Schema, model, models } = mongoose

const RelationshipSchema = new Schema(
  {
    targetId: {
      type: Schema.Types.ObjectId,
      ref: 'EntityGraph',
      required: true,
      index: true,
    },
    targetName: { type: String, required: true },
    type: { type: String, required: true, trim: true },
    context: { type: String, trim: true },
    strength: { type: Number, min: 0, max: 100, default: 50 },
    firstObservedDate: { type: Date },
    lastObservedDate: { type: Date },
    evidence: [{ source: { type: String }, url: { type: String }, date: { type: Date } }],
  },
  { _id: false }
)

const EntityGraphSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true, index: true },
    type: { type: String, enum: ENTITY_TYPES, required: true, index: true },
    aliases: { type: [String], index: true },
    relationships: { type: [RelationshipSchema], default: [] },
    documents: [
      {
        type: { type: String, trim: true },
        url: { type: String, trim: true },
        title: { type: String, trim: true },
        timestamp: { type: Date },
      },
    ],
  },
  {
    timestamps: true,
    collection: 'entity_graph',
  }
)

export default models.EntityGraph || model('EntityGraph', EntityGraphSchema)
