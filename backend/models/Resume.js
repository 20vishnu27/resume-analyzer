const mongoose = require("mongoose");

const resumeSchema = new mongoose.Schema(
  {
    fileName:         { type: String, required: true },
    text:             { type: String, default: "" },
    skills:           { type: [String], default: [] },
    missingSkills:    { type: [String], default: [] },
    skillsByCategory: { type: Map, of: [String], default: {} },
    atsScore:         { type: Number, default: 0 },
    jobMatchScore:    { type: Number, default: 0 },
    scoreBreakdown: {
      skillsScore:     { type: Number, default: 0 },
      educationScore:  { type: Number, default: 0 },
      experienceScore: { type: Number, default: 0 },
      keywordScore:    { type: Number, default: 0 },
    },
    education:         { type: String, default: "" },
    experience:        { type: String, default: "" },
    summary:           { type: String, default: "" },
    matchedKeywords:   { type: [String], default: [] },
    jdMissingKeywords: { type: [String], default: [] },
    suggestions: [
      {
        priority: { type: String, enum: ["high", "medium", "low"] },
        text:     { type: String },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Resume", resumeSchema);