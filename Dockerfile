### Single Dockerfile (frontend + api)
### Multistage: build frontend, copy dist into api/dist, install api deps, run API server

# Frontend build stage
FROM node:18 AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
COPY frontend/ .
RUN npm install && npm run build

# API build stage (includes production runtime)
FROM node:18-bullseye-slim AS api
WORKDIR /app

# Install system deps required by some native modules (sharp / puppeteer)
RUN apt-get update && apt-get install -y \
  build-essential python3 ca-certificates wget g++ git \
  libx11-6 libatk1.0-0 libatk-bridge2.0-0 libcups2 libxcomposite1 libxdamage1 libxrandr2 libgbm1 libnss3 libasound2 libpangocairo-1.0-0 libgtk-3-0 \
  && rm -rf /var/lib/apt/lists/*

# copy api sources
COPY api/package*.json ./api/
COPY api/ ./api/

# copy built frontend into api/dist so the API can serve it
COPY --from=frontend-build /app/frontend/dist ./api/dist

WORKDIR /app/api
RUN npm install --omit=dev

ENV NODE_ENV=production
EXPOSE 2029

CMD ["node", "server.js"]
