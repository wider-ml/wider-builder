# -------------------------
# Builder stage (all deps)
# -------------------------
FROM node:20.18.0 AS builder
WORKDIR /app

# Set Node.js memory options to prevent heap out of memory
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Install pnpm globally
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Disable Husky hooks
ENV HUSKY=0

# Install all dependencies (dev + prod)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build Remix with increased memory
RUN pnpm run build

# -------------------------
# Production stage
# -------------------------
FROM node:20.18.0 AS bolt-ai-production
WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Copy only prod dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile --ignore-scripts

# Copy build output from builder
COPY --from=builder /app/build ./build
COPY --from=builder /app/public ./public


# Set runtime environment
ENV NODE_ENV=production \
    PORT=5173 \
    RUNNING_IN_DOCKER=true \
    WRANGLER_SEND_METRICS=false

EXPOSE 5173

# Start Remix server
CMD ["pnpm", "run", "start:prod"]
