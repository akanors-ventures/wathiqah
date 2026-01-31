# -------------------------
# Base image with pnpm
# -------------------------
FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
RUN corepack prepare pnpm@10.28.1 --activate

# -------------------------
# Prune monorepo for api
# -------------------------
FROM base AS pruner
WORKDIR /app

COPY . .
RUN pnpm dlx turbo prune api --docker

# -------------------------
# Install deps & build
# -------------------------
FROM base AS builder
WORKDIR /app

# Install only pruned deps
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml

RUN pnpm install --frozen-lockfile

# Copy full pruned source
COPY --from=pruner /app/out/full/ .

# Generate Prisma client (no real DB needed)
WORKDIR /app/apps/api
ENV DATABASE_URL="file:./dev.db"
RUN pnpm prisma generate

# Build the api via Turbo (root)
WORKDIR /app
RUN pnpm build --filter api --output-logs=errors-only

# -------------------------
# Runtime image
# -------------------------
FROM gcr.io/distroless/nodejs20-debian12 AS runner

WORKDIR /app/apps/api

# Copy built app + prod deps + package.json
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/prisma ./prisma
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/apps/api/package.json ./package.json

EXPOSE ${PORT}

ENV NODE_ENV=production

CMD ["./dist/src/main.js"]
