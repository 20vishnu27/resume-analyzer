import re
import io
import requests
import pdfplumber
from typing import Optional
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from dotenv import load_dotenv
import os
load_dotenv()
HF_API_KEY = os.getenv("HF_API_KEY")

# ── App Setup ──────────────────────────────────────────────────────────────────

app = FastAPI(title="Resume Analyzer API", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Expanded Skills Library ────────────────────────────────────────────────────
# Grouped by category so we can return category-aware results

SKILLS_CATEGORIES = {
    "Languages": [
        "python", "java", "javascript", "typescript", "c", "c++", "c#",
        "go", "rust", "kotlin", "swift", "ruby", "php", "scala", "r",
        "matlab", "perl", "bash", "shell scripting"
    ],
    "Web & Frontend": [
        "react", "angular", "vue", "html", "css", "sass", "tailwind",
        "next.js", "nuxt", "svelte", "redux", "graphql", "rest api",
        "webpack", "vite", "jquery"
    ],
    "Backend & Frameworks": [
        "node.js", "django", "flask", "fastapi", "spring boot", "express",
        "laravel", "rails", "asp.net", "fastify", "nestjs"
    ],
    "Databases": [
        "sql", "mysql", "postgresql", "mongodb", "redis", "elasticsearch",
        "sqlite", "oracle", "cassandra", "dynamodb", "firebase"
    ],
    "Cloud & DevOps": [
        "aws", "azure", "gcp", "docker", "kubernetes", "terraform",
        "ansible", "jenkins", "github actions", "ci/cd", "linux",
        "nginx", "apache", "heroku", "vercel"
    ],
    "Data & ML": [
        "machine learning", "deep learning", "tensorflow", "pytorch",
        "scikit-learn", "pandas", "numpy", "matplotlib", "seaborn",
        "opencv", "nlp", "computer vision", "data analysis",
        "tableau", "power bi", "spark", "hadoop", "kafka"
    ],
    "Tools & Practices": [
        "git", "github", "gitlab", "jira", "agile", "scrum",
        "unit testing", "tdd", "microservices", "system design",
        "oop", "data structures", "algorithms"
    ],
}

# Flat list for quick lookup
ALL_SKILLS = [skill for skills in SKILLS_CATEGORIES.values() for skill in skills]

STOP_WORDS = {
    "a", "an", "the", "with", "and", "or", "for", "to", "of", "in",
    "looking", "experience", "required", "candidate", "role",
    "work", "skills", "knowledge", "ability", "using", "good",
    "strong", "well", "years", "year", "team", "must", "have",
    "will", "able", "plus", "based", "also", "etc"
}

# ── Text Cleaning ──────────────────────────────────────────────────────────────

def clean_text(text: str) -> str:
    text = text.lower()
    text = re.sub(r'[^a-zA-Z0-9\s\+\#]', ' ', text)  # keep + and # for C++, C#
    text = re.sub(r'\s+', ' ', text).strip()
    return text

# ── PDF Extraction ─────────────────────────────────────────────────────────────

def extract_text_from_pdf(file_bytes: bytes) -> str:
    text = ""
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    return text.strip()

# ── Skill Extraction ───────────────────────────────────────────────────────────

def extract_skills(text: str) -> dict:
    """
    Returns found skills grouped by category, plus a flat found/missing list.
    Uses multi-word matching (e.g. 'machine learning', 'next.js').
    """
    text_clean = clean_text(text)

    found_by_category = {}
    found_flat = []
    missing_flat = []

    for category, skills in SKILLS_CATEGORIES.items():
        found_in_cat = []
        for skill in skills:
            # Use word-boundary aware matching for multi-word skills
            pattern = r'\b' + re.escape(skill) + r'\b'
            if re.search(pattern, text_clean):
                found_in_cat.append(skill)
                found_flat.append(skill)
            else:
                missing_flat.append(skill)
        if found_in_cat:
            found_by_category[category] = found_in_cat

    return {
        "found": found_flat,
        "missing": missing_flat,
        "by_category": found_by_category,
        "total": len(ALL_SKILLS),
        "found_count": len(found_flat),
    }

# ── Education Detection ────────────────────────────────────────────────────────

EDUCATION_PATTERNS = {
    "phd":          (["phd", "ph.d", "doctorate", "doctoral"], 20),
    "postgraduate": (["m.tech", "mtech", "m.e", "mba", "master", "m.sc", "msc", "pg"], 20),
    "undergraduate":(["b.tech", "btech", "b.e", "be ", "bachelor", "b.sc", "bsc", "b.com", "bca", "bba"], 20),
    "diploma":      (["diploma", "12th", "hsc", "polytechnic"], 10),
}

def extract_education(text: str) -> tuple[str, int]:
    text_lower = text.lower()
    for level, (keywords, score) in EDUCATION_PATTERNS.items():
        if any(kw in text_lower for kw in keywords):
            return level, score
    return "not detected", 0

# ── Experience Detection ───────────────────────────────────────────────────────

def extract_experience(text: str) -> tuple[int | None, int]:
    """
    Returns (years_or_None, score).
    None means clearly a fresher/student, not just 'not mentioned'.
    """
    text_lower = text.lower()

    # Try to find explicit year mentions
    matches = re.findall(r'(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)\s*(?:of\s+)?(?:experience|exp)?', text_lower)
    if matches:
        years = max(float(m) for m in matches)
        if years >= 7:
            return int(years), 20
        elif years >= 4:
            return int(years), 17
        elif years >= 2:
            return int(years), 13
        else:
            return int(years), 10

    # Fresher signals
    fresher_signals = ["fresher", "intern", "trainee", "student", "final year",
                       "currently pursuing", "pursuing", "undergraduate student"]
    if any(sig in text_lower for sig in fresher_signals):
        return None, 8   # None = confirmed fresher

    return None, 5       # None = not mentioned

# ── TF-IDF Job Match ───────────────────────────────────────────────────────────

def tfidf_match_score(resume_text: str, job_desc: str) -> tuple[int, list[str]]:
    """
    Uses cosine similarity on TF-IDF vectors for a more semantically
    meaningful match score vs. naive word overlap.
    """
    vectorizer = TfidfVectorizer(stop_words='english', ngram_range=(1, 2))
    try:
        tfidf_matrix = vectorizer.fit_transform([resume_text, job_desc])
        similarity = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
        score = int(round(similarity * 100))
    except Exception:
        score = 0

    # Also get overlapping meaningful keywords for display
    resume_words = set(clean_text(resume_text).split()) - STOP_WORDS
    jd_words     = set(clean_text(job_desc).split())    - STOP_WORDS
    matched_keywords = sorted(resume_words & jd_words, key=len, reverse=True)[:20]

    return score, matched_keywords

def get_missing_from_jd(resume_text: str, job_desc: str) -> list[str]:
    resume_words = set(clean_text(resume_text).split()) - STOP_WORDS
    jd_words     = set(clean_text(job_desc).split())    - STOP_WORDS
    missing = jd_words - resume_words
    # Filter out very short or numeric tokens
    missing = [w for w in missing if len(w) > 2 and not w.isdigit()]
    return sorted(missing)[:30]

# ── ATS Score ─────────────────────────────────────────────────────────────────

def calculate_ats_score(
    found_count: int,
    total_skills: int,
    edu_score: int,
    exp_score: int,
    job_match: int | None
) -> tuple[int, dict]:
    skill_score   = int((found_count / total_skills) * 40)
    keyword_score = int((job_match / 100) * 20) if job_match is not None else 10

    breakdown = {
        "skills_score":    skill_score,
        "education_score": edu_score,
        "experience_score":exp_score,
        "keyword_score":   keyword_score,
    }
    total = min(skill_score + edu_score + exp_score + keyword_score, 100)
    return total, breakdown

# ── Suggestions Engine ─────────────────────────────────────────────────────────

def generate_suggestions(
    found: list[str],
    jd_missing: list[str],
    edu_level: str,
    exp_years: int | None,
    job_match: int,
    skill_data: dict
) -> list[dict]:
    """
    Returns a list of prioritised suggestion dicts:
    { priority: 'high'|'medium'|'low', text: str }
    """
    suggestions = []

    # High-value missing JD skills
    high_value = ["docker", "kubernetes", "aws", "azure", "gcp", "react",
                  "typescript", "system design", "microservices"]
    jd_high = [s for s in jd_missing if s in high_value]
    if jd_high:
        suggestions.append({
            "priority": "high",
            "text": f"Add these high-demand skills from the JD: {', '.join(jd_high[:4])}."
        })

    # No projects / internships for fresher
    if exp_years is None and edu_level == "undergraduate":
        suggestions.append({
            "priority": "high",
            "text": "As a fresher, add a dedicated Projects section with GitHub links. This directly boosts ATS keyword matching."
        })

    # Low job match
    if job_match < 50:
        suggestions.append({
            "priority": "high",
            "text": f"Your JD keyword match is only {job_match}%. Tailor your resume language to mirror the job description more closely."
        })

    # Missing entire categories
    found_cats = set(skill_data.get("by_category", {}).keys())
    if "Cloud & DevOps" not in found_cats:
        suggestions.append({
            "priority": "medium",
            "text": "No Cloud/DevOps skills detected. Even basic AWS (S3, EC2) or Docker experience stands out."
        })
    if "Tools & Practices" not in found_cats:
        suggestions.append({
            "priority": "medium",
            "text": "Mention Git, GitHub, and Agile practices explicitly — ATS scanners look for these."
        })

    # Remaining JD gaps
    other_missing = [s for s in jd_missing if s not in high_value]
    if other_missing:
        suggestions.append({
            "priority": "low",
            "text": f"Other keywords in the JD not found in your resume: {', '.join(other_missing[:6])}."
        })

    return suggestions if suggestions else [
        {"priority": "low", "text": "Your resume looks comprehensive! Keep updating it with new projects and skills."}
    ]

# ── Rule-based Summary Fallback ────────────────────────────────────────────────

def rule_based_summary(
    edu_level: str,
    exp_years: int | None,
    found_skills: list[str],
    skill_by_cat: dict
) -> str:
    exp_part = (
        f"{exp_years} years of experience" if exp_years and exp_years > 0
        else "a fresher"
    )
    top_cats = list(skill_by_cat.keys())[:3]
    skill_part = (
        f"with skills spanning {', '.join(top_cats)}" if top_cats
        else "with a foundational skill set"
    )
    top_skills = found_skills[:5]
    tech_part = f"Key technologies include: {', '.join(top_skills)}." if top_skills else ""

    return (
        f"Candidate is {exp_part} at the {edu_level} level, "
        f"{skill_part}. {tech_part}"
    ).strip()

# ── Hugging Face Summarization ─────────────────────────────────────────────────

def ai_summarize(text: str, fallback_summary: str) -> str:
    if not HF_API_KEY:
        return fallback_summary

    API_URL = "https://router.huggingface.co/hf-inference/models/facebook/bart-large-cnn"
    headers = {"Authorization": f"Bearer {HF_API_KEY}"}
    trimmed = " ".join(text.split()[:800])

    try:
        response = requests.post(
            API_URL,
            headers=headers,
            json={"inputs": trimmed, "options": {"wait_for_model": True}},
            timeout=30
        )
        if response.status_code != 200:
            return fallback_summary

        result = response.json()
        if isinstance(result, list) and result and "summary_text" in result[0]:
            return result[0]["summary_text"]
        return fallback_summary

    except Exception:
        return fallback_summary  # always return something useful

# ── Shared Analysis Logic ──────────────────────────────────────────────────────

def run_analysis(resume_text: str, job_description: str = "") -> dict:
    skill_data               = extract_skills(resume_text)
    edu_level, edu_score     = extract_education(resume_text)
    exp_years, exp_score     = extract_experience(resume_text)

    if job_description.strip():
        job_match, matched_kw = tfidf_match_score(resume_text, job_description)
        jd_missing            = get_missing_from_jd(resume_text, job_description)
    else:
        job_match, matched_kw, jd_missing = 0, [], []

    ats_score, breakdown = calculate_ats_score(
        skill_data["found_count"],
        skill_data["total"],
        edu_score,
        exp_score,
        job_match if job_description.strip() else None
    )

    fallback = rule_based_summary(edu_level, exp_years, skill_data["found"], skill_data["by_category"])
    summary  = ai_summarize(resume_text, fallback)

    suggestions = generate_suggestions(
        skill_data["found"], jd_missing, edu_level, exp_years,
        job_match, skill_data
    )

    exp_display = f"{exp_years} years" if exp_years is not None and exp_years > 0 else "fresher / not mentioned"

    missing_to_show = jd_missing if job_description.strip() else skill_data["missing"][:20]

    return {
        "ats_score":           ats_score,
        "score_breakdown":     breakdown,
        "skills": {
            "found":           skill_data["found"],
            "missing":         missing_to_show,
            "by_category":     skill_data["by_category"],
            "found_count":     skill_data["found_count"],
            "total_checked":   skill_data["total"],
        },
        "education":           edu_level,
        "experience":          exp_display,
        "summary":             summary,
        "job_match_score":     job_match,
        "matched_keywords":    matched_kw,
        "jd_missing_keywords": jd_missing,
        "suggestions":         suggestions,
    }

# ── Request Model ──────────────────────────────────────────────────────────────

class ResumeRequest(BaseModel):
    text: str
    job_description: Optional[str] = ""

# ── Routes ─────────────────────────────────────────────────────────────────────

@app.get("/")
def home():
    return {"message": "Resume Analyzer API v2.0 — Running"}

@app.get("/health")
def health():
    return {"status": "ok", "version": "2.0"}

@app.post("/analyze")
def analyze(data: ResumeRequest):
    return run_analysis(data.text, data.job_description or "")

@app.post("/analyze-pdf")
async def analyze_pdf(
    file: UploadFile = File(...),
    job_description: str = Form(default="")
):
    if not file.filename.lower().endswith(".pdf"):
        return {"error": "Only PDF files are supported."}

    file_bytes  = await file.read()
    resume_text = extract_text_from_pdf(file_bytes)

    if not resume_text or len(resume_text.strip()) < 50:
        return {"error": "Could not extract text. Make sure it's not a scanned image PDF."}

    result = run_analysis(resume_text, job_description)
    result["filename"] = file.filename
    result["extracted_preview"] = resume_text[:400] + "..."
    return result