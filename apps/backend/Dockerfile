# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root workspace files
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared/ packages/shared/
COPY apps/backend/ apps/backend/

# Install all dependencies (including devDependencies for build)
RUN npm ci --workspace=apps/backend --workspace=packages/shared --include-workspace-root

# Generate Prisma client and build
WORKDIR /app/apps/backend
RUN npx prisma generate
RUN npx tsc

# Production stage
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/ packages/shared/
COPY apps/backend/package.json apps/backend/
COPY apps/backend/prisma/ apps/backend/prisma/

RUN npm ci --workspace=apps/backend --workspace=packages/shared --include-workspace-root --omit=dev

WORKDIR /app/apps/backend
RUN npx prisma generate

COPY --from=builder /app/apps/backend/dist/ dist/
COPY apps/backend/docker-entrypoint.sh /app/apps/backend/
RUN chmod +x docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
