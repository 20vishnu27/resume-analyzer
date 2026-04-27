const Resume        = require("../models/Resume");
const analyzeResume = require("../utils/analyzerService");
const cleanupFile   = require("../utils/cleanupFile");

// ── Upload & Analyse ───────────────────────────────────────────────────────────

exports.uploadResume = async (req, res) => {
  // Cleanup helper — always runs even if we return early
  const cleanup = () => req.file?.path && cleanupFile(req.file.path);

  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded." });
    }

    // job_description is optional — sent from the frontend textarea
    const jobDescription = req.body.job_description || "";

    // Forward to FastAPI
    const result = await analyzeResume(req.file.path, jobDescription);

    // ── Normalise FastAPI response ─────────────────────────────────────────
    // Handles both old shape (result.skills = []) and new shape (result.skills = {})
    const skillsObj = result.skills && typeof result.skills === "object" && !Array.isArray(result.skills)
      ? result.skills
      : null;

    const foundSkills   = skillsObj ? skillsObj.found   : (result.skills         || []);
    const missingSkills = skillsObj ? skillsObj.missing  : (result.missing_skills || []);
    const byCategory    = skillsObj ? skillsObj.by_category : {};

    // suggestions: new backend = array, old = string
    let suggestions = [];
    if (Array.isArray(result.suggestions)) {
      suggestions = result.suggestions;
    } else if (typeof result.suggestions === "string" && result.suggestions) {
      suggestions = [{ priority: "medium", text: result.suggestions }];
    }

    // ── Save to MongoDB ────────────────────────────────────────────────────
    const savedResume = await Resume.create({
      fileName:         req.file.originalname,
      text:             result.extracted_preview || "",
      skills:           foundSkills,
      missingSkills:    missingSkills,
      skillsByCategory: byCategory,
      atsScore:         result.ats_score        || 0,
      jobMatchScore:    result.job_match_score   || 0,
      scoreBreakdown:   result.score_breakdown   || {},
      education:        result.education         || result.education_detected || "",
      experience:       result.experience        || result.experience_detected || "",
      summary:          result.summary           || "",
      matchedKeywords:  result.matched_keywords  || [],
      jdMissingKeywords:result.jd_missing_keywords || [],
      suggestions,
    });

    cleanup();

    // Return the full FastAPI result to the frontend (+ the DB id)
    return res.json({
      ...result,
      dbId: savedResume._id,
    });

  } catch (error) {
    cleanup();
    console.error("uploadResume error:", error.message);

    const status = error.message.includes("Could not connect") ? 503 : 500;
    return res.status(status).json({ error: error.message });
  }
};

// ── CRUD helpers (uncomment routes in resumeRoutes.js to enable) ──────────────

exports.getAllResumes = async (req, res) => {
  try {
    const data = await Resume.find().sort({ createdAt: -1 }).select("-text");
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getResumeById = async (req, res) => {
  try {
    const data = await Resume.findById(req.params.id);
    if (!data) return res.status(404).json({ error: "Not found" });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteResume = async (req, res) => {
  try {
    await Resume.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
