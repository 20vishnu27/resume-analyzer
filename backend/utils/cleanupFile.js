const fs = require("fs");

const cleanupFile = (path) => {
  if (fs.existsSync(path)) {
    fs.unlinkSync(path);
  }
};

module.exports = cleanupFile;