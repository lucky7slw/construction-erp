# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable

# Copy root package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json ./

# Copy all package.json files
COPY apps/api/package.json ./apps/api/
COPY packages/*/package.json ./packages/*/
COPY tools/*/package.json ./tools/*/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm build --filter @hhhomespm/api

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Install pnpm
RUN corepack enable

# Create non-root user
RUN addgroup --system --gid 1001 erp && \
    adduser --system --uid 1001 erp

# Copy package files for production dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/*/package.json ./packages/*/
COPY tools/*/package.json ./tools/*/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --production

# Copy built application
COPY --from=builder --chown=erp:erp /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=erp:erp /app/packages/*/dist ./packages/

# Copy necessary files
COPY --chown=erp:erp apps/api/.env.example ./apps/api/.env

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "const http = require('http'); \
    const options = { hostname: 'localhost', port: 3001, path: '/health', timeout: 5000 }; \
    const req = http.request(options, (res) => { \
      console.log('Health check status:', res.statusCode); \
      process.exit(res.statusCode === 200 ? 0 : 1); \
    }); \
    req.on('error', () => process.exit(1)); \
    req.on('timeout', () => process.exit(1)); \
    req.end();"

# Switch to non-root user
USER erp

# Expose port
EXPOSE 3001

# Start the application
CMD ["node", "apps/api/dist/index.js"]