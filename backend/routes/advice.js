// routes/advice.js
const express = require("express");
const Student = require("../models/Student");
const AdviceRecord = require("../models/AdviceRecord");
const requireAuth = require("../middleware/auth");
const { validateInput, generateAdvice } = require("../utils/adviceEngine");

const router = express.Router();

// POST /api/generate-advice
// Body: { gpa, courseLoad, level, semester, isFinalLevel, carryOverCourses: [{courseCode, units}], failedCourses: [...] }
router.post("/generate-advice", requireAuth, async (req, res) => {
  try {
    const {
      gpa,
      courseLoad,
      level,
      semester,
      isFinalLevel = false,
      carryOverCourses = [],
      failedCourses = [],
    } = req.body;

    const errors = validateInput({ gpa, courseLoad, level, semester });
    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join(" ") });
    }

    const advice = generateAdvice({
      gpa: Number(gpa),
      courseLoad: Number(courseLoad),
      failedCourses,
      carryOverCourses,
      level,
      semester,
      isFinalLevel: Boolean(isFinalLevel),
    });

    const record = await AdviceRecord.create({
      student: req.userId,
      gpa: Number(gpa),
      courseLoad: Number(courseLoad),
      level,
      semester,
      isFinalLevel: Boolean(isFinalLevel),
      carryOverCourses,
      failedCourses,
      advice,
    });

    // Keep the student's latest snapshot up to date too
    await Student.findByIdAndUpdate(req.userId, {
      gpa: Number(gpa),
      courseLoad: Number(courseLoad),
      level,
      semester,
      isFinalLevel: Boolean(isFinalLevel),
      coursesFailed: failedCourses,
      carryOverCourses,
      advice: advice.map((a) => a.title).join("; "),
    });

    res.status(201).json({ advice, recordId: record._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong generating your advice." });
  }
});

// GET /api/advice-history
router.get("/advice-history", requireAuth, async (req, res) => {
  try {
    const records = await AdviceRecord.find({ student: req.userId })
      .sort({ createdAt: -1 })
      .limit(20);
    res.json({ records });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Couldn't load your advice history." });
  }
});

module.exports = router;
