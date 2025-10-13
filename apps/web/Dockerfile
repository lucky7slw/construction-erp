# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable

# Copy everything (needed for workspace dependencies)
COPY . .

# Install dependencies
RUN pnpm install

# Build the application
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build --filter @hhhomespm/web

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Install pnpm
RUN corepack enable

# Create non-root user
RUN addgroup --system --gid 1001 erp && \
    adduser --system --uid 1001 erp

# Set environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Copy everything for workspace resolution
COPY . .

# Install production dependencies only (ignore scripts to skip husky)
RUN pnpm install --production --ignore-scripts

# Copy built application
COPY --from=builder --chown=erp:erp /app/apps/web/.next ./apps/web/.next
COPY --from=builder --chown=erp:erp /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=erp:erp /app/apps/web/next.config.js ./apps/web/
COPY --from=builder --chown=erp:erp /app/packages/*/dist ./packages/

# Copy necessary files
COPY --chown=erp:erp apps/web/.env.example ./apps/web/.env.local

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "const http = require('http'); \
    const options = { hostname: 'localhost', port: 3000, path: '/api/health', timeout: 5000 }; \
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
EXPOSE 3000

# Start the application
CMD ["pnpm", "--filter", "@hhhomespm/web", "start"]