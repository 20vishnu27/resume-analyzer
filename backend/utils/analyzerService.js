const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");

const analyzeResume = async (filePath) => {
  const form = new FormData();

  form.append("file", fs.createReadStream(filePath));
  form.append("job_description", "");

  const response = await axios.post(
    "http://localhost:8000/analyze-pdf",
    form,
    {
      headers: form.getHeaders()
    }
  );

  return response.data;
};

module.exports = analyzeResume;