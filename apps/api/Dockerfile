# Base stage for all others
FROM node:20-alpine AS base
# libc6-compat is often needed for native modules (like Prisma) on Alpine
RUN apk add --no-cache libc6-compat
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
RUN DATABASE_URL=${DATABASE_URL} pnpm exec prisma generate
WORKDIR /app

# Build the API
RUN pnpm build --filter api

# Clean up dev dependencies to reduce image size
# pnpm requires CI=true to prune without TTY in container builds
RUN CI=true pnpm prune --prod

# 3. Production Runner
FROM base AS runner
WORKDIR /app

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs
USER nestjs

# Copy the built application and dependencies from the builder
COPY --from=builder --chown=nestjs:nodejs /app .

# Set working directory to the api app
WORKDIR /app/apps/api

# Cloud Run injects the PORT environment variable, defaulting to 3000 here
ENV PORT=${API_PORT}
ENV NODE_ENV=production

EXPOSE ${API_PORT}

# Start the application
CMD ["node", "dist/main"]
