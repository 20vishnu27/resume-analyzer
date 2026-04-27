const express = require("express");
const router  = express.Router();

const upload = require("../middleware/upload");
const {
  uploadResume,
  getAllResumes,
  getResumeById,
  deleteResume,
} = require("../controllers/resumeController");

// ── Health check ───────────────────────────────────────────────────────────────
router.get("/health", (req, res) => {
  res.json({ status: "ok", service: "Node Resume API" });
});

// ── Main upload route ──────────────────────────────────────────────────────────
// Multer middleware runs first; if it rejects (wrong type / too large) we catch
// it below before it reaches uploadResume.
router.post(
  "/upload",
  (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err) {
        // MulterError or our custom fileFilter error
        return res.status(400).json({ error: err.message });
      }
      next();
    });
  },
  uploadResume
);

// ── Optional CRUD routes ───────────────────────────────────────────────────────
router.get("/all",    getAllResumes);
router.get("/:id",   getResumeById);
router.delete("/:id",deleteResume);

module.exports = router;
