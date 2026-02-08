# Static ffmpeg/ffprobe binaries
FROM mwader/static-ffmpeg:7.1.1 AS ffmpeg

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

# Install ffmpeg and ffprobe from static build
COPY --from=ffmpeg /ffmpeg /usr/local/bin/ffmpeg
COPY --from=ffmpeg /ffprobe /usr/local/bin/ffprobe

# Install audiowaveform runtime dependencies and .deb package
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    libsndfile1 \
    libgd3 \
    libboost-program-options1.74.0 \
    libboost-regex1.74.0 \
    libboost-filesystem1.74.0 \
    libmad0 \
    libid3tag0 \
  && curl -fsSL -o /tmp/audiowaveform.deb \
    https://github.com/bbc/audiowaveform/releases/download/1.10.1/audiowaveform_1.10.1-1-12_amd64.deb \
  && dpkg -i /tmp/audiowaveform.deb \
  && rm /tmp/audiowaveform.deb \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

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
