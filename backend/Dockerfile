FROM node:20-alpine

# Security: run as non-root user
RUN addgroup -g 1001 -S streamline && adduser -u 1001 -S streamline -G streamline

WORKDIR /app

# Install dependencies first (layer caching)
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

# Copy application code
COPY --chown=streamline:streamline . .

# Create necessary directories
RUN mkdir -p data logs && chown -R streamline:streamline /app

USER streamline

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/health || exit 1

CMD ["node", "server.js"]
