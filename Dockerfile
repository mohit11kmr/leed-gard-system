# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

FROM base AS build
# Build-time-only placeholders: src/lib/env.ts validates env at module load.
# Real values are injected by docker-compose at runtime.
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder?schema=public" \
    JWT_SECRET="build-time-placeholder-secret-32-chars-minimum!!"
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

FROM node:22-alpine AS prod-deps
WORKDIR /app
RUN apk add --no-cache openssl
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev && npx prisma generate

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 NODE_OPTIONS=--max-old-space-size=512 CHROMIUM_PATH=/usr/bin/chromium-browser
RUN apk add --no-cache openssl chromium
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./package.json
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["npm", "run", "start"]