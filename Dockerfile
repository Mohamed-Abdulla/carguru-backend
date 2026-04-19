# ---- BUILD STAGE ----
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---- PRODUCTION STAGE ----
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY scripts ./scripts
COPY cars_dataset.json ./cars_dataset.json

EXPOSE 3003

# Run seed then start server
CMD ["sh", "-c", "node scripts/seed.js && node dist/server.js"]
