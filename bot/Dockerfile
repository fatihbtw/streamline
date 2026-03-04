FROM node:20-alpine

RUN addgroup -g 1001 -S streamline && adduser -u 1001 -S streamline -G streamline

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

COPY --chown=streamline:streamline . .

USER streamline

EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3002/ || exit 0

CMD ["node", "bot.js"]
