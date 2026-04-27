const express          = require("express");
const router           = express.Router();
const upload           = require("../middleware/upload");
const resumeController = require("../controllers/resumeController");

router.get("/health", (_req, res) =>
  res.json({ status: "ok", service: "Node Resume API" })
);

router.post(
  "/upload",
  (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message });
      next();
    });
  },
  resumeController.uploadResume
);

router.get("/all",     resumeController.getAllResumes);
router.get("/:id",     resumeController.getResumeById);
router.delete("/:id",  resumeController.deleteResume);

module.exports = router;