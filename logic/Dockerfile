# ── Stage 1: build deps ───────────────────────────────────────────────────────
FROM python:3.11-slim AS deps

WORKDIR /app

# Install system deps needed by pdfplumber (poppler) and scikit-learn
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# --no-cache-dir keeps the image smaller
# --upgrade pip avoids "outdated pip" warnings in Render logs
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ── Stage 2: runtime ──────────────────────────────────────────────────────────
FROM python:3.11-slim AS runtime

WORKDIR /app

# Install only the runtime system lib pdfplumber needs
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpoppler-cpp-dev \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user
RUN useradd --create-home --shell /bin/bash appuser

# Copy installed packages from deps stage
COPY --from=deps /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=deps /usr/local/bin /usr/local/bin

# Copy application source
COPY . .

# Give appuser ownership
RUN chown -R appuser:appuser /app

USER appuser

EXPOSE 8000

# Healthcheck — Render uses this to confirm the container is ready
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

# --workers 1 is safest on Render's free tier (512 MB RAM)
# --timeout-keep-alive 75 matches Render's 75s idle timeout
CMD ["uvicorn", "main:app", \
     "--host", "0.0.0.0", \
     "--port", "8000", \
     "--workers", "1", \
     "--timeout-keep-alive", "75"]