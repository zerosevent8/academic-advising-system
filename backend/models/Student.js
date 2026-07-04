// models/Student.js
// Fields match the Data Dictionary in Chapter 4.4 of the project document.

const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema(
  {
    courseCode: { type: String, required: true, trim: true, uppercase: true },
    units: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const studentSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    matric: { type: String, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
    },
    passwordHash: { type: String, required: true },

    // Most recent academic snapshot — history of full advice
    // sessions lives in the AdviceRecord collection (see below).
    gpa: { type: Number, min: 0, max: 5 },
    courseLoad: { type: Number, min: 15, max: 24 },
    level: { type: String, enum: ["100", "200", "300", "400", "500", "600"] },
    semester: { type: String, enum: ["first", "second"] },
    isFinalLevel: { type: Boolean, default: false },
    coursesFailed: { type: [courseSchema], default: [] },
    carryOverCourses: { type: [courseSchema], default: [] },
    advice: { type: String },
  },
  { timestamps: true } // adds createdAt / updatedAt automatically
);

module.exports = mongoose.model("Student", studentSchema);
