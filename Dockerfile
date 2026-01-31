# -------------------------
# Base image with pnpm
# -------------------------
FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
RUN corepack prepare pnpm@10.28.1 --activate

# -------------------------
# Install deps & build
# -------------------------
FROM base AS builder
WORKDIR /app
COPY . .
RUN pnpm install

# Generate Prisma client (no real DB needed)
WORKDIR /app/apps/api
ENV DATABASE_URL="file:./dev.db"
RUN pnpm prisma generate

WORKDIR /app
RUN pnpm build --filter api --output-logs=errors-only
RUN pnpm --filter api deploy --prod /app/apps/api/.output

# -------------------------
# Runtime image
# -------------------------
FROM gcr.io/distroless/nodejs20-debian12 AS runner

WORKDIR /app
COPY --from=builder /app/apps/api/.output .

ENV NODE_ENV=production

CMD ["./dist/src/main.js"]
