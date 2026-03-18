FROM node:20-slim

# Playwright system dependencies + Chromium
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

RUN npx playwright install chromium

COPY tsconfig.json ./
COPY helpers/ ./helpers/
COPY load/ ./load/
COPY scripts/ ./scripts/

RUN chmod +x /app/scripts/traffic-gen.sh

ENTRYPOINT ["/bin/sh", "/app/scripts/traffic-gen.sh"]
