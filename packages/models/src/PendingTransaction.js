// packages/models/src/PendingTransaction.js
import mongoose from "mongoose";

const pendingTransactionSchema = new mongoose.Schema({
  event_key: { type: String, required: true, unique: true, index: true },
  company: { type: String, required: true },
  status: { type: String },
  announcedDate: { type: String },
  estimatedValue: { type: String },
  parties: { type: String },
  source: { type: String },
  relatedTo: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export const PendingTransaction = mongoose.model(
  "PendingTransaction",
  pendingTransactionSchema,
);
