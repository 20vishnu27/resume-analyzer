const Resume        = require("../models/Resume");
const analyzeResume = require("../utils/analyzerService");
const cleanupFile   = require("../utils/cleanupFile");

// ── Upload & Analyse ──────────────────────────────────────────────────────────

exports.uploadResume = async (req, res) => {
  const cleanup = () => req.file?.path && cleanupFile(req.file.path);

  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded." });
    }

    const jobDescription = req.body.job_description || "";

    // Forward to Python / FastAPI
    const result = await analyzeResume(req.file.path, jobDescription);

    // Normalise: new FastAPI returns skills as object, old returns flat array
    const skillsObj =
      result.skills &&
      typeof result.skills === "object" &&
      !Array.isArray(result.skills)
        ? result.skills
        : null;

    const foundSkills   = skillsObj ? skillsObj.found        : (result.skills         || []);
    const missingSkills = skillsObj ? skillsObj.missing       : (result.missing_skills || []);
    const byCategory    = skillsObj ? skillsObj.by_category   : {};

    let suggestions = [];
    if (Array.isArray(result.suggestions)) {
      suggestions = result.suggestions;
    } else if (typeof result.suggestions === "string" && result.suggestions) {
      suggestions = [{ priority: "medium", text: result.suggestions }];
    }

    const savedResume = await Resume.create({
      fileName:          req.file.originalname,
      text:              result.extracted_preview      || "",
      skills:            foundSkills,
      missingSkills:     missingSkills,
      skillsByCategory:  byCategory,
      atsScore:          result.ats_score              || 0,
      jobMatchScore:     result.job_match_score        || 0,
      scoreBreakdown:    result.score_breakdown        || {},
      education:         result.education              || result.education_detected  || "",
      experience:        result.experience             || result.experience_detected || "",
      summary:           result.summary               || "",
      matchedKeywords:   result.matched_keywords       || [],
      jdMissingKeywords: result.jd_missing_keywords    || [],
      suggestions,
    });

    cleanup();

    return res.json({ ...result, dbId: savedResume._id });

  } catch (error) {
    cleanup();
    console.error("uploadResume error:", error.message);
    const status = error.message.includes("Cannot reach") ? 503 : 500;
    return res.status(status).json({ error: error.message });
  }
};

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