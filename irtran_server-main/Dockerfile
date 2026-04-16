# Backend IrTRAN (Node) — Debian-based образ для стабильной сборки java/bcrypt (node-gyp в Alpine падает по сети)
FROM node:20-bookworm-slim AS deps

WORKDIR /app

# node-gyp (bcrypt) + JDK для пакета java (binding.gyp вызывает findJavaHome.js)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ openjdk-17-jdk \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --omit=dev

# Финальный образ: JRE нужен для aspose.cells (вызовы Java из Node)
FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends openjdk-17-jre-headless \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# sequelize-cli в devDependencies и не попадает в образ при npm ci --omit=dev
RUN npm install sequelize-cli@6.6.3 --no-save --omit=optional --no-audit --no-fund

# Windows CRLF в скрипте даёт: exec ./docker-entrypoint.sh: no such file or directory
RUN sed -i 's/\r$//' /app/docker-entrypoint.sh && chmod +x /app/docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["sh", "/app/docker-entrypoint.sh"]
CMD ["node", "app.js"]
