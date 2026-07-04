// routes/auth.js
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Student = require("../models/Student");

const router = express.Router();

function signToken(studentId) {
  return jwt.sign({ userId: studentId }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

// POST /api/auth/signup
router.post("/signup", async (req, res) => {
  try {
    const { firstName, lastName, email, matric, password } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: "Please fill in every required field." });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters." });
    }

    const existing = await Student.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const student = await Student.create({
      firstName,
      lastName,
      email: email.toLowerCase(),
      matric,
      passwordHash,
    });

    const token = signToken(student._id);
    res.status(201).json({
      token,
      student: { id: student._id, firstName: student.firstName, email: student.email },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong creating your account." });
  }
});

// POST /api/auth/signin
router.post("/signin", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const student = await Student.findOne({ email: email.toLowerCase() });
    if (!student) {
      return res.status(401).json({ message: "We couldn't find a matching account." });
    }

    const matches = await bcrypt.compare(password, student.passwordHash);
    if (!matches) {
      return res.status(401).json({ message: "Incorrect email or password." });
    }

    const token = signToken(student._id);
    res.json({
      token,
      student: { id: student._id, firstName: student.firstName, email: student.email },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong signing you in." });
  }
});

module.exports = router;
