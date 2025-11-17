FROM oven/bun:latest

WORKDIR /app

# Copy only dependency files first (for caching)
COPY package.json bun.lockb* ./

# Install deps
RUN bun install

# Copy full project
COPY . .

EXPOSE 3000

CMD ["bun", "run", "src/index.ts"]
