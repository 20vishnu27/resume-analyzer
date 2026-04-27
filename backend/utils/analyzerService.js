const axios    = require("axios");
const FormData = require("form-data");
const fs       = require("fs");

const FASTAPI_URL =
  process.env.LOGIC_API_URL ||
  process.env.FASTAPI_URL   ||
  "http://127.0.0.1:8000";

/**
 * Forwards the PDF + optional job description to the FastAPI logic service.
 * Retries once on timeout (HuggingFace cold-start can be slow).
 */
const analyzeResume = async (filePath, jobDescription = "", attempt = 1) => {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Uploaded file not found at: ${filePath}`);
  }

  const form = new FormData();
  form.append("file", fs.createReadStream(filePath));
  form.append("job_description", jobDescription);

  console.log(`[analyzerService] → ${FASTAPI_URL}/analyze-pdf (attempt ${attempt})`);

  try {
    const response = await axios.post(
      `${FASTAPI_URL}/analyze-pdf`,
      form,
      {
        headers:          form.getHeaders(),
        timeout:          90_000,          // 90 s — HuggingFace can be slow on cold start
        maxBodyLength:    Infinity,
        maxContentLength: Infinity,
      }
    );

    console.log(`[analyzerService] ✅ FastAPI responded (${response.status})`);
    return response.data;

  } catch (err) {
    // ── Retry once on timeout ────────────────────────────────────────────────
    if ((err.code === "ECONNABORTED" || err.code === "ETIMEDOUT") && attempt === 1) {
      console.warn("[analyzerService] ⏱ Timeout — retrying once...");
      return analyzeResume(filePath, jobDescription, 2);
    }

    // ── Connection refused = Python service not running ──────────────────────
    if (err.code === "ECONNREFUSED") {
      throw new Error(
        `Cannot reach the Python logic service at ${FASTAPI_URL}. ` +
        `Check that it is deployed and LOGIC_API_URL is set correctly.`
      );
    }

    // ── Surface the actual FastAPI error message ─────────────────────────────
    const detail =
      err.response?.data?.detail ||
      err.response?.data?.error  ||
      err.message;

    console.error(`[analyzerService] ❌ Error: ${detail}`);
    throw new Error(`Logic service error: ${detail}`);
  }
};

module.exports = analyzeResume;