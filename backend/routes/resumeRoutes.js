const express = require("express");
const router = express.Router();

const upload = require("../middleware/upload");
const { uploadResume } = require("../controllers/resumeController");

router.get("/health", (req, res) => {
  res.json({ message: "API Healthy" });
});

router.post("/upload", upload.single("resume"), uploadResume);

module.exports = router;