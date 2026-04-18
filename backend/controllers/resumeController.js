const extractText = require("../utils/extractText");

const savedResume = await Resume.create({
  fileName: req.file.filename,
  text,
  skills,
  missingSkills,
  score
});

exports.uploadResume = async (req, res) => {
  try {
    const text = await extractText(req.file.path);

    res.json({
      message: "Text extracted successfully",
      text: text
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};