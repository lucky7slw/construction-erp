import 'dotenv/config';

import fastify from 'fastify';
import { prisma } from './lib/database';
import { redis } from './lib/redis';
import { AuthService } from './services/auth.service';
import { WebSocketService } from './services/websocket.service';
import { authRoutes } from './routes/auth.routes';
import { aiRoutes } from './routes/ai.routes';
import { projectsRoutes } from './routes/projects.routes';
import { tasksRoutes } from './routes/tasks.routes';
import { timeEntriesRoutes } from './routes/time-entries.routes';
import { expensesRoutes } from './routes/expenses.routes';
import { crmRoutes } from './routes/crm.routes';
import { quotesRoutes } from './routes/quotes.routes';
import { estimatesRoutes } from './routes/estimates.routes';
import { companiesRoutes } from './routes/companies.routes';
import { documentsRoutes } from './routes/documents.routes';
import budgetRoutes from './routes/budget.routes.js';
import { dailyLogsRoutes } from './routes/daily-logs.routes';
import { rfisRoutes } from './routes/rfis.routes';
import { submittalsRoutes } from './routes/submittals.routes';
import { teamRoutes } from './routes/team.routes';
import { changeOrdersRoutes } from './routes/change-orders.routes';
import { purchaseOrdersRoutes } from './routes/purchase-orders.routes';
import { takeoffsRoutes } from './routes/takeoffs.routes';
import { bidsRoutes } from './routes/bids.routes';
import { selectionsRoutes } from './routes/selections.routes';
import { moodBoardsRoutes } from './routes/mood-boards.routes';
import { invoicesRoutes } from './routes/invoices.routes';
import deckRoutes from './routes/deck.routes';
import photosRoutes from './routes/photos.routes';
import { createAuthMiddleware } from './middleware/auth.middleware';
import aiAutomationRoutes from './routes/ai-automation.routes';
import integrationsRoutes from './routes/integrations.routes';
import auditLogsRoutes from './routes/audit-logs.routes';
import automationRoutes from './routes/automation.routes';
import moduleAccessRoutes from './routes/module-access.routes';
import { fileStorage } from './lib/file-storage';
import { AIService } from './services/ai/ai.service';
import type { AIConfig } from './types/ai';

const server = fastify({
  logger: process.env.NODE_ENV === 'development' ? {
    level: process.env.LOG_LEVEL ?? 'info'
  } : true
});

// Initialize services
const authService = new AuthService(
  prisma,
  redis,
  process.env.JWT_SECRET!,
  process.env.JWT_REFRESH_SECRET!
);

// Initialize WebSocket service
let wsService: WebSocketService;

// Initialize AI service
const aiConfig: AIConfig = {
  geminiApiKey: process.env.GEMINI_API_KEY!,
  model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
  maxTokens: Number(process.env.GEMINI_MAX_TOKENS) || 4096,
  temperature: Number(process.env.GEMINI_TEMPERATURE) || 0.7,
  rateLimitPerMinute: Number(process.env.AI_RATE_LIMIT) || 60,
  cacheEnabled: process.env.AI_CACHE_ENABLED !== 'false',
  cacheTtlSeconds: Number(process.env.AI_CACHE_TTL) || 3600,
};

const aiService = new AIService(prisma, redis, aiConfig);
const authMiddleware = createAuthMiddleware({ authService });

// Register plugins
async function registerPlugins() {
  // Security and CORS
  await server.register(import('@fastify/helmet'), {
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false
  });

  await server.register(import('@fastify/cors'), {
    origin: process.env.NODE_ENV === 'production'
      ? (origin, callback) => {
          const allowedOrigins = (process.env.WEB_BASE_URL || 'http://localhost:3000').split(',').map(url => url.trim());
          if (allowedOrigins.includes(origin)) {
            callback(null, true);
          } else {
            callback(new Error('Not allowed by CORS'), false);
          }
        }
      : true,
    credentials: true
  });

  // Cookie support
  await server.register(import('@fastify/cookie'), {
    secret: process.env.JWT_SECRET,
    parseOptions: {}
  });

  // JWT support
  await server.register(import('@fastify/jwt'), {
    secret: process.env.JWT_SECRET!,
    cookie: {
      cookieName: 'refreshToken',
      signed: false
    }
  });

  // Rate limiting
  await server.register(import('@fastify/rate-limit'), {
    global: false,
    max: 100,
    timeWindow: '1 minute'
  });

  // Multipart support for file uploads
  await server.register(import('@fastify/multipart'), {
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB max file size
      files: 10, // Max 10 files per request
    },
  });

  // Swagger documentation
  await server.register(import('@fastify/swagger'), {
    openapi: {
      info: {
        title: 'Construction ERP API',
        description: 'API for Construction Management ERP System with Authentication, AI, and Real-time Updates',
        version: '0.1.0'
      },
      servers: [
        {
          url: process.env.API_BASE_URL || 'http://localhost:3001',
          description: 'Development server'
        }
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
          }
        }
      },
      security: [
        {
          bearerAuth: []
        }
      ]
    }
  });

  await server.register(import('@fastify/swagger-ui'), {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'full',
      deepLinking: false
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
    transformSpecification: (swaggerObject) => {
      return swaggerObject;
    }
  });
}

// Database and Redis health check
async function healthCheck() {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;

    // Test Redis connection
    await redis.ping();

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        redis: 'connected',
        websocket: wsService ? 'active' : 'inactive',
        connectedClients: wsService ? wsService.getConnectedUserCount() : 0
      }
    };
  } catch (error) {
    server.log.error(error, 'Health check failed');
    throw new Error('Service unavailable');
  }
}

// Health check route
server.get('/health', async () => {
  return await healthCheck();
});

// Database health check
server.get('/health/db', async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', service: 'database' };
  } catch (error) {
    server.log.error(error, 'Database health check failed');
    throw new Error('Database unavailable');
  }
});

// Redis health check
server.get('/health/redis', async () => {
  try {
    await redis.ping();
    return { status: 'ok', service: 'redis' };
  } catch (error) {
    server.log.error(error, 'Redis health check failed');
    throw new Error('Redis unavailable');
  }
});

// WebSocket health check
server.get('/health/websocket', async () => {
  try {
    if (!wsService) {
      throw new Error('WebSocket service not initialized');
    }

    return {
      status: 'ok',
      service: 'websocket',
      connectedClients: wsService.getConnectedUserCount()
    };
  } catch (error) {
    server.log.error(error, 'WebSocket health check failed');
    throw new Error('WebSocket unavailable');
  }
});

// Register API routes
async function registerRoutes() {
  // Authentication routes
  await server.register(authRoutes, {
    prefix: '/api/v1/auth',
    authService
  });

  // AI routes (protected)
  await server.register(async function(fastify) {
    // Add authentication middleware to AI routes
    fastify.addHook('preHandler', authMiddleware.authenticate);

    await fastify.register(aiRoutes, {
      prefix: '/ai',
      aiService
    });
  }, { prefix: '/api/v1' });


  // Public OAuth callback routes (no auth required)
  await server.register(async function(fastify) {
    const { GoogleIntegrationService } = await import('./services/integrations/google.service');
    const { QuickBooksIntegrationService } = await import('./services/integrations/quickbooks.service');
    const googleService = new GoogleIntegrationService(prisma);
    const quickbooksService = new QuickBooksIntegrationService(prisma);

    fastify.get('/integrations/google/callback', async (request, reply) => {
      const { code, state: userId } = request.query as { code: string; state: string };
      await googleService.handleCallback(code, userId);
      return reply.redirect(`${process.env.WEB_BASE_URL}/settings?tab=integrations&success=google`);
    });

    fastify.get('/integrations/quickbooks/callback', async (request, reply) => {
      const url = request.url;
      const { state: userId } = request.query as { state: string };
      await quickbooksService.handleCallback(url, userId);
      return reply.redirect(`${process.env.WEB_BASE_URL}/settings?tab=integrations&success=quickbooks`);
    });
  }, { prefix: '/api/v1' });
  // Protected API v1 routes for project management
  await server.register(async function(fastify) {
    // Add authentication middleware to all routes in this context
    fastify.addHook('preHandler', authMiddleware.authenticate);

    // Projects routes
    await fastify.register(projectsRoutes, {
      prefix: '/projects',
      prisma
    });

    // Tasks routes
    await fastify.register(tasksRoutes, {
      prefix: '/tasks',
      prisma
    });

    // Time entries routes
    await fastify.register(timeEntriesRoutes, {
      prefix: '/time-entries',
      prisma
    });

    // Expenses routes
    await fastify.register(expensesRoutes, {
      prefix: '/expenses',
      prisma,
      aiService
    });

    // CRM routes
    await fastify.register(crmRoutes, {
      prefix: '/crm',
      prisma
    });

    // Quotes routes
    await fastify.register(quotesRoutes, {
      prefix: '/quotes',
      prisma,
      aiService
    });

    // Estimates routes
    await fastify.register(estimatesRoutes, {
      prefix: '/estimates',
      prisma
    });

    // Companies routes
    await fastify.register(companiesRoutes, {
      prisma
    });

    // Documents routes
    await fastify.register(documentsRoutes, {
      prisma
    });

    // Budget routes
    await fastify.register(budgetRoutes);

    // Daily logs routes
    await fastify.register(dailyLogsRoutes, {
      prefix: '/daily-logs',
      prisma
    });

    // RFIs routes
    await fastify.register(rfisRoutes, {
      prefix: '/rfis',
      prisma
    });

    // Submittals routes
    await fastify.register(submittalsRoutes, {
      prefix: '/submittals',
      prisma
    });

    // Team routes
    await fastify.register(teamRoutes, {
      prefix: '/team',
      prisma
    });

    // Photos routes

    // Change orders routes
    await fastify.register(changeOrdersRoutes, {
      prefix: '/change-orders',
      prisma
    });

    // Purchase orders routes
    await fastify.register(purchaseOrdersRoutes, {
      prefix: '/purchase-orders',
      prisma
    });

    // Takeoffs routes
    await fastify.register(takeoffsRoutes, {
      prefix: '/takeoffs',
      prisma
    });

    // Bids routes
    await fastify.register(bidsRoutes, {
      prefix: '/bids',
      prisma
    });

    // Selections routes
    await fastify.register(selectionsRoutes, {
      prefix: '/selections',
      prisma
    });

    // Mood Boards routes
    await fastify.register(moodBoardsRoutes, {
      prefix: '/mood-boards',
      prisma
    });

    // Invoices routes
    await fastify.register(invoicesRoutes, {
      prefix: '/invoices',
      prisma
    });

    // Deck Builder routes
     await fastify.register(deckRoutes, {
       prefix: '/deck',
       prisma
     });

    // Photos routes
    await fastify.register(photosRoutes, {
      prefix: '/photos',
      prisma
    });

    // AI Automation routes
    await fastify.register(aiAutomationRoutes, {
      prefix: '/ai-automation',
      prisma
    });

    // Integrations routes
    await fastify.register(integrationsRoutes, {
      prefix: '/integrations',
      prisma
    });

    // Audit logs routes (super admin only)
    await fastify.register(auditLogsRoutes, {
      prefix: '/audit-logs',
      prisma
    });

    // Automation routes
    await fastify.register(automationRoutes, {
      prefix: '/automation',
      prisma
    });

    // Module access routes
    await fastify.register(moduleAccessRoutes, {
      prefix: '/module-access',
      prisma
    });

    // User profile route
    fastify.get('/me', {
      schema: {
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              user: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  email: { type: 'string' },
                  firstName: { type: 'string' },
                  lastName: { type: 'string' }
                }
              }
            }
          }
        },
        tags: ['User'],
        summary: 'Get current user',
        description: 'Get authenticated user information'
      }
    }, async (request) => {
      if (!request.user) {
        throw new Error('Authentication required');
      }

      return { user: request.user };
    });

  }, { prefix: '/api/v1' });

  // Public API routes
  await server.register(async function(fastify) {
    fastify.get('/status', {
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              version: { type: 'string' },
              environment: { type: 'string' }
            }
          }
        },
        tags: ['System'],
        summary: 'API status',
        description: 'Get API status and version information'
      }
    }, async () => {
      return {
        status: 'operational',
        version: '0.1.0',
        environment: process.env.NODE_ENV || 'development'
      };
    });
  }, { prefix: '/api/v1' });
}

async function start() {
  try {
    // Validate required environment variables
    const requiredEnvVars = [
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
      'DATABASE_URL',
      'GEMINI_API_KEY'
    ];
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
      }
    }

    // Connect to Redis
    await redis.connect();
    server.log.info('Connected to Redis');

    // Test database connection
    await prisma.$connect();
    server.log.info('Connected to database');

    // Initialize file storage
    await fileStorage.initialize();
    server.log.info('File storage initialized');

    // Register plugins and routes BEFORE starting server
    await registerPlugins();
    await registerRoutes();

    const port = Number(process.env.API_PORT) || 3001;
    const host = process.env.HOST ?? '0.0.0.0';

    // Start Fastify server
    await server.listen({ port, host });

    // Initialize WebSocket service AFTER server is started
    wsService = new WebSocketService(server.server, authService, redis);
    server.log.info('WebSocket service initialized');

    // Start automated backup and calendar sync
    const { startScheduler } = await import('./lib/scheduler');
    startScheduler(prisma);

    server.log.info(`🚀 Construction ERP API server listening on http://${host}:${port}`);
    server.log.info(`📚 API Documentation available at http://${host}:${port}/docs`);
    server.log.info(`🏥 Health check available at http://${host}:${port}/health`);
    server.log.info(`🔌 WebSocket server ready for connections`);

  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

// Handle graceful shutdown
async function gracefulShutdown() {
  server.log.info('Shutting down gracefully...');

  try {
    if (wsService) {
      await wsService.close();
      server.log.info('WebSocket service closed');
    }

    await server.close();
    await prisma.$disconnect();
    await redis.quit();
    server.log.info('Graceful shutdown completed');
  } catch (error) {
    server.log.error(error, 'Error during graceful shutdown');
  }

  process.exit(0);
}

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  server.log.error({ reason, promise }, 'Unhandled Rejection');
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  server.log.error({ error }, 'Uncaught Exception');
  process.exit(1);
});

void start();
