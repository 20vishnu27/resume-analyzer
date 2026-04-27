const mongoose = require("mongoose");

const resumeSchema = new mongoose.Schema(
  {
    fileName:        { type: String, required: true },
    text:            { type: String, default: "" },

    // Skills — new backend returns an object, we store the flat arrays
    skills:          { type: [String], default: [] },
    missingSkills:   { type: [String], default: [] },
    skillsByCategory:{ type: Map, of: [String], default: {} },

    // Scores
    atsScore:        { type: Number, default: 0 },
    jobMatchScore:   { type: Number, default: 0 },
    scoreBreakdown: {
      skillsScore:    { type: Number, default: 0 },
      educationScore: { type: Number, default: 0 },
      experienceScore:{ type: Number, default: 0 },
      keywordScore:   { type: Number, default: 0 },
    },

    // Detected info
    education:       { type: String, default: "" },
    experience:      { type: String, default: "" },
    summary:         { type: String, default: "" },

    // JD-related (optional — only present when JD was provided)
    matchedKeywords:   { type: [String], default: [] },
    jdMissingKeywords: { type: [String], default: [] },

    // Suggestions — stored as array of { priority, text }
    suggestions: [
      {
        priority: { type: String, enum: ["high", "medium", "low"] },
        text:     { type: String },
      },
    ],
  },
  { timestamps: true }   // adds createdAt + updatedAt automatically
);

module.exports = mongoose.model("Resume", resumeSchema);
