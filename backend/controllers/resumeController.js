const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");

module.exports = async function analyzeResume(filePath, jobDescription = "") {
  try {
    const logicUrl = process.env.LOGIC_API_URL;

    if (!logicUrl) {
      throw new Error("LOGIC_API_URL is not set in environment variables.");
    }

    const formData = new FormData();

    // Send uploaded file to FastAPI
    formData.append("file", fs.createReadStream(filePath));

    // Optional job description
    formData.append("job_description", jobDescription);

    const response = await axios.post(
      `${logicUrl}/analyze`,
      formData,
      {
        headers: formData.getHeaders(),
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      }
    );

    return response.data;

  } catch (error) {
    console.error("FastAPI analyze error:", error.message);

    throw new Error("Could not connect to resume analysis service.");
  }
};