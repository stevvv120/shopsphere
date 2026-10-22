# syntax=docker/dockerfile:1

# ---- build: semua dependensi, kompilasi, dan Prisma Client ----
# Stage ini juga dipakai service "migrate" (butuh Prisma CLI dan ts-node).
FROM node:22-bookworm-slim AS build
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
COPY prisma.config.ts tsconfig.json tsconfig.build.json nest-cli.json ./
# prisma.config.ts mewajibkan DATABASE_URL ada; generate tidak benar-benar terhubung ke database.
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" npx prisma generate

COPY src ./src
RUN npm run build

# ---- runtime: hanya dependensi produksi ----
FROM node:22-bookworm-slim AS runtime
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3001
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Prisma Client hasil generate + query engine dari stage build
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/dist ./dist
COPY public ./public

USER node
EXPOSE 3001
CMD ["node", "dist/main.js"]