const fs = require("fs");

/**
 * Deletes a temporary file from disk.
 * Uses async unlink so it never blocks the response pipeline.
 */
const cleanupFile = (filePath) => {
  if (!filePath) return;
  fs.unlink(filePath, (err) => {
    if (err && err.code !== "ENOENT") {
      // ENOENT = file already gone — not a real error
      console.warn(`⚠ Could not delete temp file: ${filePath}`, err.message);
    }
  });
};

module.exports = cleanupFile;
