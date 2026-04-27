"use client";

import { useEffect, useState } from "react";
import "./result.css";

// ── Types ──────────────────────────────────────────────────────────────────────

interface ScoreBreakdown {
  skills_score: number;
  education_score: number;
  experience_score: number;
  keyword_score: number;
}

interface SkillData {
  found: string[];
  missing: string[];
  by_category: Record<string, string[]>;
  found_count: number;
  total_checked: number;
}

interface Suggestion {
  priority: "high" | "medium" | "low";
  text: string;
}

interface AnalysisResult {
  ats_score: number;
  score_breakdown: ScoreBreakdown;
  skills: SkillData;
  education: string;
  experience: string;
  summary: string;
  job_match_score: number;
  matched_keywords: string[];
  jd_missing_keywords: string[];
  suggestions: Suggestion[];
  filename?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 75) return "#16a34a";
  if (score >= 50) return "#d97706";
  return "#dc2626";
}

function scoreLabel(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 65) return "Good";
  if (score >= 50) return "Fair";
  if (score >= 35) return "Needs Work";
  return "Weak";
}

function priorityMeta(p: Suggestion["priority"]) {
  if (p === "high")   return { label: "High impact" };
  if (p === "medium") return { label: "Medium" };
  return                     { label: "Low" };
}

// ── Animated Counter ──────────────────────────────────────────────────────────

function AnimatedNumber({ target, duration = 1200 }: { target: number; duration?: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (target === 0) return;
    let current = 0;
    const step = Math.ceil(target / (duration / 16));
    const timer = setInterval(() => {
      current = Math.min(current + step, target);
      setDisplay(current);
      if (current >= target) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);

  return <>{display}</>;
}

// ── Score Ring ─────────────────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <svg width="140" height="140" viewBox="0 0 140 140" style={{ transform: "rotate(-90deg)" }}>
      <circle cx="70" cy="70" r={r} fill="none" stroke="#f1f5f9" strokeWidth="12" />
      <circle
        cx="70" cy="70" r={r}
        fill="none"
        stroke={scoreColor(score)}
        strokeWidth="12"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)" }}
      />
    </svg>
  );
}

// ── Breakdown Bar ─────────────────────────────────────────────────────────────

function BreakdownBar({ label, score, max, color }: {
  label: string; score: number; max: number; color: string;
}) {
  const pct = Math.round((score / max) * 100);
  return (
    <div className="ra-bar-row">
      <div className="ra-bar-header">
        <span className="ra-bar-label">{label}</span>
        <span className="ra-bar-score">{score}<span>/{max}</span></span>
      </div>
      <div className="ra-bar-track">
        <div className="ra-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

// ── Tag ───────────────────────────────────────────────────────────────────────

function Tag({ label, variant }: { label: string; variant: "found" | "missing" | "match" }) {
  return <span className={`ra-tag ra-tag--${variant}`}>{label}</span>;
}

// ── Card ──────────────────────────────────────────────────────────────────────

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`ra-card ${className}`}>{children}</div>;
}

// ── Main Page ─────────────────────────────────────────────────────────────────

function loadResult(): AnalysisResult | null {
  try {
    const stored = localStorage.getItem("result");
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return parsed.data ?? parsed;
  } catch {
    console.error("Failed to parse stored result.");
    return null;
  }
}

export default function ResultPage() {
  // Lazy initialiser runs once on mount — no useEffect needed, no cascading render
  const [result] = useState<AnalysisResult | null>(loadResult);
  const [activeTab, setActiveTab] = useState<"found" | "missing">("found");

  if (!result) {
    return (
      <div className="ra-loading">
        <div className="ra-loading__inner">
          <div className="ra-spinner" />
          <p className="ra-loading__text">Loading your analysis…</p>
        </div>
      </div>
    );
  }

  const bd         = result.score_breakdown ?? {};
  const skills     = result.skills ?? {};
  const byCategory = skills.by_category ?? {};
  const hasJD      = result.job_match_score > 0;
  const color      = scoreColor(result.ats_score);

  const metrics = [
    { label: "Job match",    value: hasJD ? `${result.job_match_score}%` : "—",           sub: hasJD ? "vs. job description" : "no JD provided" },
    { label: "Skills found", value: `${skills.found_count ?? skills.found?.length ?? 0}`, sub: `of ${skills.total_checked ?? "—"} checked` },
    { label: "Education",    value: result.education ?? "—",                              sub: "detected level" },
    { label: "Experience",   value: result.experience ?? "—",                             sub: "from resume" },
  ];

  return (
    <div className="ra-root">

      {/* ── Top bar ── */}
      <div className="ra-topbar">
        <div className="ra-topbar__brand">
          <div className="ra-topbar__logo">R</div>
          <span className="ra-topbar__name">ResumeAI</span>
        </div>
        <span className="ra-topbar__filename">{result.filename ?? "Resume Analysis"}</span>
        <button className="ra-topbar__back" onClick={() => window.history.back()}>
          ← Analyse another
        </button>
      </div>

      {/* ── Content ── */}
      <div className="ra-content">

        {/* Title */}
        <div className="ra-title">
          <h1>Resume Analysis Report</h1>
          <p className="ra-title__sub">
            Powered by AI ·{" "}
            {new Date().toLocaleDateString("en-IN", {
              day: "numeric", month: "long", year: "numeric",
            })}
          </p>
        </div>

        {/* ── Row 1: Score ring + metrics ── */}
        <div className="ra-row1">
          <Card className="ra-score-card">
            <div className="ra-score-ring-wrap">
              <ScoreRing score={result.ats_score} />
              <div className="ra-score-ring-inner">
                <span className="ra-score-number" style={{ color }}>
                  <AnimatedNumber target={result.ats_score} />%
                </span>
                <span className="ra-score-sublabel">ATS Score</span>
              </div>
            </div>
            <span className="ra-score-badge" style={{ color, background: `${color}18` }}>
              {scoreLabel(result.ats_score)}
            </span>
          </Card>

          <div className="ra-metrics-grid">
            {metrics.map(({ label, value, sub }) => (
              <Card key={label} className="ra-metric-card">
                <p className="ra-metric-label">{label}</p>
                <p className="ra-metric-value">{value}</p>
                <p className="ra-metric-sub">{sub}</p>
              </Card>
            ))}
          </div>
        </div>

        {/* ── Row 2: Breakdown + Summary ── */}
        <div className="ra-row2">
          <Card>
            <p className="ra-section-label">Score breakdown</p>
            <BreakdownBar label="Skills match" score={bd.skills_score ?? 0}     max={40} color="#6366f1" />
            <BreakdownBar label="Education"    score={bd.education_score ?? 0}  max={20} color="#16a34a" />
            <BreakdownBar label="Experience"   score={bd.experience_score ?? 0} max={20} color="#d97706" />
            <BreakdownBar label="JD keywords"  score={bd.keyword_score ?? 0}    max={20} color="#0891b2" />
          </Card>

          <Card>
            <p className="ra-section-label">AI summary</p>
            <p className="ra-summary-text">{result.summary}</p>
          </Card>
        </div>

        {/* ── Skills (tabbed) ── */}
        <Card className="ra-skills-card">
          <div className="ra-skills-header">
            <p className="ra-section-label" style={{ marginBottom: 0 }}>Skills</p>
            <div className="ra-tab-group">
              {(["found", "missing"] as const).map((tab) => (
                <button
                  key={tab}
                  className={`ra-tab ${activeTab === tab ? "ra-tab--active" : ""}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab === "found"
                    ? `Detected (${skills.found?.length ?? 0})`
                    : `Missing (${skills.missing?.length ?? 0})`}
                </button>
              ))}
            </div>
          </div>

          {activeTab === "found" ? (
            Object.keys(byCategory).length > 0 ? (
              <div className="ra-category-group">
                {Object.entries(byCategory).map(([cat, catSkills]) => (
                  <div key={cat}>
                    <p className="ra-category-label">{cat.toUpperCase()}</p>
                    <div>{catSkills.map((s) => <Tag key={s} label={s} variant="found" />)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div>{(skills.found ?? []).map((s) => <Tag key={s} label={s} variant="found" />)}</div>
            )
          ) : (
            <div>{(skills.missing ?? []).map((s) => <Tag key={s} label={s} variant="missing" />)}</div>
          )}
        </Card>

        {/* ── Matched JD keywords ── */}
        {hasJD && (result.matched_keywords?.length ?? 0) > 0 && (
          <Card className="ra-keywords-card">
            <p className="ra-section-label">Matched JD keywords</p>
            <div>{result.matched_keywords.map((k) => <Tag key={k} label={k} variant="match" />)}</div>
          </Card>
        )}

        {/* ── Suggestions ── */}
        {(result.suggestions?.length ?? 0) > 0 && (
          <Card>
            <p className="ra-section-label">Suggestions to improve your score</p>
            <div className="ra-suggestions-list">
              {result.suggestions.map((s, i) => (
                <div key={i} className={`ra-suggestion ra-suggestion--${s.priority}`}>
                  <span className="ra-suggestion__badge">{priorityMeta(s.priority).label}</span>
                  <p className="ra-suggestion__text">{s.text}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

      </div>
    </div>
  );
}
