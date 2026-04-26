const Resume = require("../models/Resume");
const analyzeResume = require("../utils/analyzerService");
const cleanupFile = require("../utils/cleanupFile");


exports.getAllResumes = async (req, res) => {
  const data = await Resume.find().sort({ createdAt: -1 });
  res.json(data);
};

exports.getResumeById = async (req, res) => {
  const data = await Resume.findById(req.params.id);
  res.json(data);
};

exports.deleteResume = async (req, res) => {
  await Resume.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted successfully" });
};

exports.uploadResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const result = await analyzeResume(req.file.path);

    const savedResume = await Resume.create({
      fileName: req.file.filename,
      text: result.extracted_preview || "",
      skills: result.skills || [],
      missingSkills: result.missing_skills || [],
      score: result.ats_score || 0
    });

    cleanupFile(req.file.path);

    res.json({
      message: "Resume analyzed successfully",
      data: result,
      dbId: savedResume._id
    });

  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
};