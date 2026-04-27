const fs = require("fs");

const cleanupFile = (filePath) => {
  if (!filePath) return;
  fs.unlink(filePath, (err) => {
    if (err && err.code !== "ENOENT") {
      console.warn(`⚠ Could not delete temp file: ${filePath}`, err.message);
    }
  });
};

module.exports = cleanupFile;