require("dotenv").config();

const express = require("express");
const cors = require("cors");
const fs = require("fs");

const connectDB = require("./config/db");
const resumeRoutes = require("./routes/resumeRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// ── Database ────────────────────────────────────────────────
connectDB();

// ── CORS (single clean config) ──────────────────────────────
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      process.env.FRONTEND_URL
    ].filter(Boolean),
    methods: ["GET", "POST", "DELETE"],
    credentials: true
  })
);

// ── Middleware ───────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure uploads folder exists
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

// ── Routes ──────────────────────────────────────────────────
app.use("/api/resume", resumeRoutes);

// ── Root Health Check ───────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    message: "Resume Analyzer Node API running ✅",
    port: PORT
  });
});

// ── Global Error Handler ────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.message);

  res.status(500).json({
    error: err.message || "Server error"
  });
});

// ── Start Server ────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Node API running on port ${PORT}`);
});