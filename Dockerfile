# syntax=docker/dockerfile:1.4

### Stage 1: Builder
FROM oven/bun:latest AS builder

WORKDIR /app

# Copy dependency files first for caching
COPY package.json bun.lock* ./

# Install all dependencies (dev + prod)
RUN bun install

# Copy full source
COPY . .

### Stage 2: Runtime
FROM oven/bun:slim AS runtime

WORKDIR /app
ENV NODE_ENV=production

# Copy package files and install only production deps
COPY package.json bun.lock* ./
RUN bun install --production

# Copy source files from builder
COPY --from=builder /app/src ./src

EXPOSE 3000
CMD ["bun", "run", "src/index.ts"]