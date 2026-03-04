FROM node:20-alpine

# Security: run as non-root user
RUN addgroup -g 1001 -S mediaflow && adduser -u 1001 -S mediaflow -G mediaflow

WORKDIR /app

# Install dependencies first (layer caching)
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

# Copy application code
COPY --chown=mediaflow:mediaflow . .

# Create necessary directories
RUN mkdir -p data logs && chown -R mediaflow:mediaflow /app

USER mediaflow

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/health || exit 1

CMD ["node", "server.js"]
