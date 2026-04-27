require("dotenv").config();

const express      = require("express");
const cors         = require("cors");
const path         = require("path");
const connectDB    = require("./config/db");
const resumeRoutes = require("./routes/resumeRoutes");

const app  = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://yourfrontend.vercel.app"
  ]
}));

// ── Database ───────────────────────────────────────────────────────────────────
connectDB();

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  methods: ["GET", "POST", "DELETE"],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Make sure the uploads folder exists
const fs = require("fs");
if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");

// ── Routes ─────────────────────────────────────────────────────────────────────
app.use("/api/resume", resumeRoutes);

// ── Root health check ──────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({ message: "Resume Analyzer Node API running ✅", port: PORT });
});

// ── Global error handler ───────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.message);
  res.status(500).json({ error: err.message });
});

// ── Start ──────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Node API running on http://localhost:${PORT}`);
});
