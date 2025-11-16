# Use a slim Node base image
FROM node:20-bullseye-slim

# Set working directory
WORKDIR /app

# Install Bun and add to PATH in the same step
RUN curl -fsSL https://bun.sh/install | bash && \
    export PATH="/root/.bun/bin:$PATH" && \
    bun --version

# Add Bun to PATH permanently for following steps
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
