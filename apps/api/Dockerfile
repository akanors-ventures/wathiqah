# Base stage for all others
FROM node:20-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
RUN corepack prepare pnpm@10.28.1 --activate

# 1. Prune the workspace to include only what's needed for 'api'
FROM base AS pruner
WORKDIR /app
RUN npm install -g turbo
COPY . .
# Generates a partial monorepo in /app/out
RUN turbo prune --scope=api --docker

# 2. Install dependencies and build
FROM base AS builder
WORKDIR /app

# Copy lockfiles and package.json's from the pruner stage
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml

# Install dependencies (including devDependencies for building)
RUN pnpm install --frozen-lockfile

# Copy the full source code from the pruner stage
COPY --from=pruner /app/out/full/ .

# Generate Prisma Client
# We run this explicitly to ensure the client is generated before build
WORKDIR /app/apps/api
RUN DATABASE_URL="postgresql://postgres:postgres@localhost:5432/wathiqah?schema=public" pnpm exec prisma generate
WORKDIR /app

# Build the API
RUN pnpm build --filter api

# Clean up dev dependencies to reduce image size
# pnpm requires CI=true to prune without TTY in container builds
RUN CI=true pnpm prune --prod

# 3. Production Runner
FROM gcr.io/distroless/nodejs20-debian12:nonroot AS runner
WORKDIR /app

# Copy the built application and dependencies from the builder
COPY --from=builder --chown=nonroot:nonroot /app .

# Set working directory to the api app
WORKDIR /app/apps/api

# Cloud Run will inject PORT; just set NODE_ENV
ENV NODE_ENV=production

CMD ["node", "dist/src/main.js"]
