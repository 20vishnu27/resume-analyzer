const axios   = require("axios");
const FormData = require("form-data");
const fs       = require("fs");

const FASTAPI_URL = process.env.FASTAPI_URL || "http://127.0.0.1:8000";

/**
 * Forwards the uploaded PDF (and optional job description) to the
 * FastAPI Python service and returns the parsed analysis result.
 *
 * @param {string} filePath      - Absolute/relative path to the temp PDF on disk
 * @param {string} jobDescription - Optional job description text
 * @returns {Promise<object>}    - The analysis result from FastAPI
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
        timeout: 60_000, // 60 s — HuggingFace summarisation can be slow
      }
    );
    return response.data;

  } catch (err) {
    if (err.code === "ECONNREFUSED") {
      throw new Error(
        `Could not connect to FastAPI at ${FASTAPI_URL}. ` +
        `Make sure the Python service is running (uvicorn main:app --reload).`
      );
    }
    // Axios wraps non-2xx responses — surface the FastAPI error message
    const detail = err.response?.data?.detail || err.response?.data?.error || err.message;
    throw new Error(`FastAPI error: ${detail}`);
  }
};

module.exports = analyzeResume;
