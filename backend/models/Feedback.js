// models/Feedback.js
// One row per (advice record, advice item) the student has rated.
// Lets the department see which kinds of advice actually land.

const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    adviceRecord: { type: mongoose.Schema.Types.ObjectId, ref: "AdviceRecord", required: true },
    itemIndex: { type: Number, required: true }, // which advice card within that record
    tag: { type: String }, // e.g. "Carry-Over Plan" — denormalized for easy reporting
    rating: { type: String, enum: ["up", "down"], required: true },
  },
  { timestamps: true }
);

// One rating per student per advice item — resubmitting updates it instead
// of creating duplicates.
feedbackSchema.index({ student: 1, adviceRecord: 1, itemIndex: 1 }, { unique: true });

module.exports = mongoose.model("Feedback", feedbackSchema);
