"use client";

import { useState, useRef, DragEvent } from "react";
import { useRouter } from "next/navigation";
import "./home.css";

export default function Home() {
  const [file, setFile]           = useState<File | null>(null);
  const [jobDesc, setJobDesc]     = useState("");
  const [dragging, setDragging]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const inputRef                  = useRef<HTMLInputElement>(null);
  const router                    = useRouter();

  // ── File helpers ────────────────────────────────────────────────────────────

  function acceptFile(f: File | null) {
    if (!f) return;
    if (f.type !== "application/pdf") {
      setError("Only PDF files are supported.");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError("File must be under 10 MB.");
      return;
    }
    setError("");
    setFile(f);
  }

  function onDrop(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragging(false);
    acceptFile(e.dataTransfer.files?.[0] ?? null);
  }

  // ── Submit ───────────────────────────────────────────────────────────────────

  async function handleAnalyze() {
    if (!file) { setError("Please upload your resume first."); return; }
    setError("");
    setLoading(true);

    const form = new FormData();
    form.append("file", file);               // FastAPI expects "file"
    form.append("job_description", jobDesc); // optional

    try {
      // NEXT_PUBLIC_API_URL should be your Node backend URL on Render
      // e.g. https://resume-analyzer-api-oohb.onrender.com
      const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:5000";
      const res  = await fetch(`${BASE}/api/resume/upload`, { method: "POST", body: form });

      if (!res.ok) {
        const detail = await res.text().catch(() => res.statusText);
        throw new Error(`Server error (${res.status}): ${detail}`);
      }

      const data = await res.json();
      localStorage.setItem("result",   JSON.stringify(data));
      localStorage.setItem("fileName", file.name);
      router.push("/result");

    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setError(
        message.includes("Failed to fetch") || message.includes("NetworkError")
          ? "Could not reach the server. Please try again in a moment."
          : message
      );
    } finally {
      setLoading(false);
    }
  }

  // ── UI ───────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="up-loading">
        <div className="up-loading__box">
          <div className="up-spinner" />
          <p className="up-loading__title">Analysing your resume…</p>
          <p className="up-loading__sub">This usually takes 10–20 seconds</p>
          <div className="up-progress">
            <div className="up-progress__bar" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="up-root">

      {/* ── Top bar ── */}
      <div className="up-topbar">
        <div className="up-topbar__brand">
          <div className="up-topbar__logo">R</div>
          <span className="up-topbar__name">ResumeAI</span>
        </div>
        <span className="up-topbar__tag">Free · No sign-up required</span>
      </div>

      {/* ── Hero ── */}
      <div className="up-content">
        <div className="up-hero">
          <p className="up-hero__eyebrow">AI-powered resume analysis</p>
          <h1 className="up-hero__title">
            Know exactly how your<br />resume performs
          </h1>
          <p className="up-hero__sub">
            Upload your PDF resume, optionally paste a job description,
            and get an instant ATS score, skill gap analysis, and tailored suggestions.
          </p>
        </div>

        {/* ── Card ── */}
        <div className="up-card">

          {/* Drop zone */}
          <label
            className={`up-dropzone ${dragging ? "up-dropzone--drag" : ""} ${file ? "up-dropzone--filled" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
          >
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf"
              className="up-dropzone__input"
              onChange={(e) => acceptFile(e.target.files?.[0] ?? null)}
            />

            {file ? (
              <div className="up-dropzone__filled">
                <div className="up-file-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                </div>
                <div>
                  <p className="up-dropzone__filename">{file.name}</p>
                  <p className="up-dropzone__filesize">{(file.size / 1024).toFixed(0)} KB · PDF</p>
                </div>
                <button
                  className="up-dropzone__remove"
                  onClick={(e) => { e.preventDefault(); setFile(null); }}
                  aria-label="Remove file"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="up-dropzone__empty">
                <div className="up-upload-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                </div>
                <p className="up-dropzone__prompt">
                  <span className="up-dropzone__link">Click to upload</span> or drag & drop
                </p>
                <p className="up-dropzone__hint">PDF only · max 10 MB</p>
              </div>
            )}
          </label>

          {/* Divider */}
          <div className="up-divider">
            <span>Job description <span className="up-optional">(optional — improves accuracy)</span></span>
          </div>

          {/* JD textarea */}
          <textarea
            className="up-textarea"
            rows={5}
            placeholder="Paste the job description here to get a tailored match score and specific keyword suggestions…"
            value={jobDesc}
            onChange={(e) => setJobDesc(e.target.value)}
          />

          {/* Error */}
          {error && (
            <div className="up-error">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            className="up-btn"
            onClick={handleAnalyze}
            disabled={!file}
          >
            Analyse resume →
          </button>

          {/* Stats row */}
          <div className="up-stats">
            {[
              { value: "80+", label: "Skills detected" },
              { value: "4",   label: "Score dimensions" },
              { value: "AI",  label: "Powered summary" },
            ].map(({ value, label }) => (
              <div key={label} className="up-stat">
                <span className="up-stat__value">{value}</span>
                <span className="up-stat__label">{label}</span>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
