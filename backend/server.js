require("dotenv").config();

const express = require("express");
const cors    = require("cors");
const fs      = require("fs");
const path    = require("path");

const connectDB    = require("./config/db");
const resumeRoutes = require("./routes/resumeRoutes");

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Database ────────────────────────────────────────────────────────────────
connectDB();

// ── Trust Render's proxy (required for correct IP / HTTPS detection) ────────
app.set("trust proxy", 1);

// ── CORS ────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  process.env.FRONTEND_URL,       // e.g. https://your-app.vercel.app
].filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow server-to-server calls (no origin) and listed origins
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    credentials: true,
  })
);

// ── Body parsers ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ── Uploads directory ─────────────────────────────────────────────────────────
// Render's filesystem is read-only EXCEPT /tmp — always use /tmp for uploads
const UPLOAD_DIR = process.env.UPLOAD_DIR || "/tmp/uploads";
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
// Make the path available to middleware
app.locals.uploadDir = UPLOAD_DIR;

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/resume", resumeRoutes);

// ── Root health check ─────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({ message: "Resume Analyzer Node API ✅", port: PORT });
});

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.message);
  res.status(500).json({ error: err.message || "Internal server error" });
});

// ── Start ─────────────────────────────────────────────────────────────────────
// Must bind to 0.0.0.0 on Render — localhost alone won't work
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Node API on http://0.0.0.0:${PORT}`);
  console.log(`   Upload dir : ${UPLOAD_DIR}`);
  console.log(`   FastAPI URL: ${process.env.LOGIC_API_URL || "http://127.0.0.1:8000"}`);
  console.log(`   Frontend   : ${process.env.FRONTEND_URL || "(not set)"}`);
});