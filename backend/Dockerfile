# ── Stage 1: deps ─────────────────────────────────────────────────────────────
FROM node:20-slim AS deps

WORKDIR /app

# Copy manifests first so Docker caches this layer
# and only re-runs npm install when package.json changes
COPY package*.json ./
RUN npm install --omit=dev

# ── Stage 2: runtime ───────────────────────────────────────────────────────────
FROM node:20-slim AS runtime

# Create a non-root user — good security practice, required by some cloud platforms
RUN useradd --create-home --shell /bin/bash appuser

WORKDIR /app

# Copy installed node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application source
COPY . .

# Render's filesystem is read-only except /tmp
# Pre-create the uploads dir in /tmp so multer can write there
RUN mkdir -p /tmp/uploads && chown appuser:appuser /tmp/uploads

# Switch to non-root user
USER appuser

# Tell Docker which port the app listens on (Render reads this)
EXPOSE 5000

# Healthcheck — Render uses this to know the container is ready
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# Use node directly instead of npm start —
# this makes the process PID 1 so signals (SIGTERM) are handled correctly
CMD ["node", "server.js"]