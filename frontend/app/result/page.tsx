"use client";

import { useEffect, useState } from "react";

export default function ResultPage() {
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    const stored = localStorage.getItem("result");

    if (stored) {
      setResult(JSON.parse(stored));
    }
  }, []);

  if (!result) return <div>Loading...</div>;

  const data = result.data;

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-fixed p-8"
      style={{
        backgroundImage:
          "url('https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1400&q=80')",
      }}
    >
      {/* overlay */}
      <div className="absolute inset-0 bg-white/70 backdrop-blur-sm -z-0"></div>

      <div className="relative z-10 max-w-6xl mx-auto">

        {/* TITLE */}
        <h1 className="text-5xl font-bold text-center text-slate-700 tracking-tight font-serif mb-10">
          Resume Analysis Report
        </h1>

        {/* SCORE */}
        <div className="bg-white/60 backdrop-blur-xl rounded-3xl shadow-xl p-8 mb-8 border border-white/50">
          <p className="text-center text-gray-600 text-xl">ATS Score</p>

          <h2 className="text-center text-7xl font-bold text-slate-800 font-serif">
            {data.ats_score}%
          </h2>

          <div className="w-full bg-orange-100 rounded-full h-4 mt-6 overflow-hidden">
            <div
              className="bg-gradient-to-r from-slate-500 to-indigo-500 h-4 rounded-full"
              style={{ width: `${data.ats_score}%` }}
            ></div>
          </div>
        </div>

        {/* SKILLS */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">

          {/* detected */}
          <div className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 shadow-xl">
            <h2 className="text-2xl font-bold text-green-600 mb-4">
              ✅ Detected Skills
            </h2>

            <div className="flex flex-wrap gap-3">
              {data.skills.map((skill: string, i: number) => (
                <span
                  key={i}
                  className="bg-green-100 text-green-700 px-4 py-2 rounded-full"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* missing */}
          <div className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 shadow-xl">
            <h2 className="text-2xl font-bold text-red-500 mb-4">
              ⚠ Missing Skills
            </h2>

            <div className="flex flex-wrap gap-3">
              {data.missing_skills.map((skill: string, i: number) => (
                <span
                  key={i}
                  className="bg-red-100 text-red-600 px-4 py-2 rounded-full"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* SUMMARY */}
        <div className="bg-white/60 backdrop-blur-xl rounded-3xl shadow-xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-slate-700 font-serif mb-4">
            📄 AI Summary
          </h2>

          <p className="text-gray-700 leading-8 text-lg">
            {data.summary}
          </p>
        </div>

        {/* EDUCATION + EXPERIENCE */}
        <div className="grid md:grid-cols-2 gap-6">

          <div className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 shadow-xl">
            <h2 className="text-xl font-bold text-yellow-600 mb-3">
              🎓 Education
            </h2>

            <p className="text-gray-700 text-lg">
              {data.education_detected}
            </p>
          </div>

          <div className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 shadow-xl">
            <h2 className="text-xl font-bold text-purple-600 mb-3">
              💼 Experience
            </h2>

            <p className="text-gray-700 text-lg">
              {data.experience_detected}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}