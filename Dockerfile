# Build stage
FROM node:20-bookworm-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN mkdir -p ./data/db
RUN npm run build
RUN npm prune --production

# Runtime stage
FROM node:20-bookworm-slim
WORKDIR /app

RUN mkdir -p /data/audio /data/peaks /data/art /data/db

COPY --from=builder /app/build build/
COPY --from=builder /app/node_modules node_modules/
COPY --from=builder /app/package.json .
COPY --from=builder /app/drizzle drizzle/

EXPOSE 8800

ENV NODE_ENV=production
ENV PORT=8800
ENV ORIGIN=https://wallyblanchard.com
ENV BODY_SIZE_LIMIT=512M
ENV DATABASE_URL=/data/db/music.db

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD node -e "fetch('http://localhost:8800/music/health').then(r=>{if(!r.ok)throw r;process.exit(0)}).catch(()=>process.exit(1))"

CMD ["node", "build"]
