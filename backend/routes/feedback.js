// routes/feedback.js
const express = require("express");
const Feedback = require("../models/Feedback");
const requireAuth = require("../middleware/auth");

const router = express.Router();

// POST /api/feedback
// Body: { adviceRecordId, itemIndex, tag, rating: "up" | "down" }
// Upserts — resubmitting the same item just updates the rating.
router.post("/feedback", requireAuth, async (req, res) => {
  try {
    const { adviceRecordId, itemIndex, tag, rating } = req.body;

    if (!adviceRecordId || itemIndex === undefined || !["up", "down"].includes(rating)) {
      return res.status(400).json({ message: "adviceRecordId, itemIndex, and a valid rating are required." });
    }

    const feedback = await Feedback.findOneAndUpdate(
      { student: req.userId, adviceRecord: adviceRecordId, itemIndex },
      { tag, rating },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(201).json({ feedback });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong saving your feedback." });
  }
});

// GET /api/feedback/:adviceRecordId — this student's ratings for one record
router.get("/feedback/:adviceRecordId", requireAuth, async (req, res) => {
  try {
    const items = await Feedback.find({
      student: req.userId,
      adviceRecord: req.params.adviceRecordId,
    });
    res.json({ items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Couldn't load feedback for this record." });
  }
});

module.exports = router;
