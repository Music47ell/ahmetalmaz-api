# Use a slim Node base image
FROM node:20-bullseye-slim

# Set working directory
WORKDIR /app

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash

# Add Bun to PATH
ENV PATH="/root/.bun/bin:$PATH"

# Copy project files
COPY package.json bun.lockb* ./
COPY . .

# Install dependencies
RUN bun install

# Expose port your Hono API uses
EXPOSE 3000

# Start the API
CMD ["bun", "run", "src/index.ts"]
