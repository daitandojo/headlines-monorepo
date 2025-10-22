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
    type: { type: String, required: true, trim: true }, // e.g., 'Founder Of', 'Acquired', 'Board Member Of'
    context: { type: String, trim: true }, // e.g., "From event [Event ID]" or "Source: Wikipedia"
  },
  { _id: false }
)

const EntityGraphSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true, index: true },
    type: { type: String, enum: ENTITY_TYPES, required: true, index: true },
    aliases: { type: [String], index: true },
    relationships: { type: [RelationshipSchema], default: [] },
  },
  {
    timestamps: true,
    collection: 'entity_graph',
  }
)

export default models.EntityGraph || model('EntityGraph', EntityGraphSchema)
