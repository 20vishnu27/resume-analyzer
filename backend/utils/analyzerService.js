const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");

// Uses Render env variable first, falls back to local development
const FASTAPI_URL =
  process.env.LOGIC_API_URL ||
  process.env.FASTAPI_URL ||
  "http://127.0.0.1:8000";

/**
 * Sends uploaded PDF + optional job description
 * to FastAPI logic service.
 *
 * @param {string} filePath
 * @param {string} jobDescription
 * @returns {Promise<object>}
 */
const analyzeResume = async (filePath, jobDescription = "") => {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found at path: ${filePath}`);
  }

  const form = new FormData();
  form.append("file", fs.createReadStream(filePath));
  form.append("job_description", jobDescription);

  try {
    const response = await axios.post(
      `${FASTAPI_URL}/analyze-pdf`,
      form,
      {
        headers: form.getHeaders(),
        timeout: 60000,
        maxBodyLength: Infinity,
        maxContentLength: Infinity
      }
    );

    return response.data;

  } catch (err) {
    if (err.code === "ECONNREFUSED") {
      throw new Error(
        `Could not connect to logic service at ${FASTAPI_URL}`
      );
    }

    const detail =
      err.response?.data?.detail ||
      err.response?.data?.error ||
      err.message;

    throw new Error(`Logic service error: ${detail}`);
  }
};

module.exports = analyzeResume;