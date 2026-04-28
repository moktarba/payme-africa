# ── Stage 1 : dépendances ─────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev --ignore-scripts

# ── Stage 2 : image production finale ─────────────────────────
FROM node:20-alpine AS runner
RUN addgroup -g 1001 -S nodejs && adduser -S payme -u 1001

WORKDIR /app

# Copier les dépendances compilées du stage 1
COPY --from=deps --chown=payme:nodejs /app/node_modules ./node_modules

# Copier le code source
COPY --chown=payme:nodejs . .

USER payme
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:4000/health || exit 1

CMD ["node", "src/app.js"]
