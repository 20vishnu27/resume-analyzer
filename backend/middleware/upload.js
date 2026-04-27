const multer = require("multer");
const path   = require("path");
const fs     = require("fs");

// Render's filesystem is read-only except /tmp
// We read the dir set by server.js, or fall back to /tmp/uploads
const UPLOAD_DIR = process.env.UPLOAD_DIR || "/tmp/uploads";

// Ensure the directory exists at require-time too
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename:    (_req, file, cb) => {
    // Strip special chars so the filename is safe on every OS
    const safe = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    cb(null, `${Date.now()}-${safe}`);
  },
});

function fileFilter(_req, file, cb) {
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new Error("Only PDF files are allowed."), false);
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

module.exports = upload;