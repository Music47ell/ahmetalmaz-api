FROM jarredsumner/bun:latest

WORKDIR /app

# Copy package files for caching
COPY package.json bun.lockb* ./

# Install dependencies
RUN bun install

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Run API
CMD ["bun", "run", "src/index.ts"]
