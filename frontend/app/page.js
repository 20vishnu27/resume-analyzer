"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Loader from "@/components/Loader";

export default function Home() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleAnalyze = async () => {
    if (!file) {
      alert("Upload resume first");
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append("resume", file);

    try {
      const res = await fetch("http://localhost:5000/api/resume/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Backend error");
      }

      const data = await res.json();

      localStorage.setItem("result", JSON.stringify(data));
      localStorage.setItem("fileName", file.name);

      router.push("/result");
    } catch (error) {
      console.error(error);
      alert("Error connecting backend");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Show loader screen while analyzing
  if (loading) {
    return <Loader />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] to-[#020617] flex items-center justify-center text-white">
      <div className="text-center">

        <h1 className="text-4xl font-bold mb-2 text-cyan-400">
          AI Resume Analyzer
        </h1>

        <p className="text-gray-400 mb-8">
          Upload your PDF resume and get instant AI feedback
        </p>

        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-8 w-[400px]">

          <label className="cursor-pointer border border-dashed border-cyan-400 p-6 rounded-lg block mb-4 hover:bg-white/10 transition">
            <p className="text-gray-300 truncate">
              {file ? file.name : "Upload Your Resume"}
            </p>

            <input
              type="file"
              accept="application/pdf"
              onChange={(e) =>
                setFile(e.target.files ? e.target.files[0] : null)
              }
              className="hidden"
            />
          </label>

          <button
            onClick={handleAnalyze}
            className="bg-cyan-500 hover:bg-cyan-600 w-full py-2 rounded font-semibold transition"
          >
            Analyze Resume
          </button>

        </div>
      </div>
    </div>
  );
}