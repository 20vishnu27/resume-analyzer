const mongoose = require("mongoose");

const resumeSchema = new mongoose.Schema({
  fileName: String,
  text: String,
  skills: [String],
  missingSkills: [String],
  score: Number,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Resume", resumeSchema);