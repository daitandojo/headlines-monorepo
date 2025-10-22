// packages/models/src/Feedback.js
import mongoose from 'mongoose'
const { Schema, model, models } = mongoose

const FeedbackSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'Subscriber',
      required: true,
      index: true,
    },
    itemId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    itemType: {
      type: String,
      enum: ['article', 'event', 'opportunity'],
      required: true,
      index: true,
    },
    // 'favorite' is positive feedback, 'discard' is negative.
    feedbackType: {
      type: String,
      enum: ['favorite', 'discard', 'report_inaccurate'],
      required: true,
    },
    // For future explicit feedback UI
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: 'feedback',
  }
)

export default models.Feedback || model('Feedback', FeedbackSchema)
