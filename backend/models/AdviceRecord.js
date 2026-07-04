// models/AdviceRecord.js
// Stores every advice session a student runs, so the dashboard
// can show history even after gpa/courseLoad data changes.

const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema(
  {
    courseCode: { type: String, required: true, trim: true, uppercase: true },
    units: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const adviceItemSchema = new mongoose.Schema(
  {
    flag: { type: String, enum: ["low", "warn", "good"], required: true },
    tag: { type: String, required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
  },
  { _id: false }
);

const adviceRecordSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    gpa: { type: Number, required: true, min: 0, max: 5 },
    courseLoad: { type: Number, required: true, min: 15, max: 24 },
    level: { type: String, enum: ["100", "200", "300", "400", "500", "600"] },
    semester: { type: String, enum: ["first", "second"] },
    isFinalLevel: { type: Boolean, default: false },
    carryOverCourses: { type: [courseSchema], default: [] },
    failedCourses: { type: [courseSchema], default: [] },
    advice: { type: [adviceItemSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AdviceRecord", adviceRecordSchema);
