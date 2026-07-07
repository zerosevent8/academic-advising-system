// server.js
// Entry point for the Academic Advising System API.
// Architecture matches Chapter 4.2 of the project document:
// Presentation (React) -> Application (Express/Node) -> Data (MongoDB)

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const authRoutes = require("./routes/auth");
const adviceRoutes = require("./routes/advice");
const feedbackRoutes = require("./routes/feedback");

const app = express();

// Allow any localhost/127.0.0.1 port automatically — handy since the
// frontend's dev server port changes (8080, 8081, etc. depending on what's
// free). CLIENT_ORIGIN in .env is still respected for a fixed production
// origin once this is deployed (e.g. your GitHub Pages URL).
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true); // curl/Postman/no-origin requests
      const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
      const isGithubPages = /^https:\/\/[^.]+\.github\.io$/.test(origin);
      if (isLocalhost || isGithubPages || origin === process.env.CLIENT_ORIGIN) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS: " + origin));
    },
    credentials: true,
  })
);
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ status: "ok", service: "academic-advising-server" });
});

app.use("/api/auth", authRoutes);
app.use("/api", adviceRoutes);
app.use("/api", feedbackRoutes);

// Fallback 404
app.use((req, res) => {
  res.status(404).json({ message: "Route not found." });
});

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  });
