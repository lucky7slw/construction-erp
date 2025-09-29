import 'dotenv/config';

import fastify from 'fastify';

const server = fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        ignore: 'pid,hostname'
      }
    }
  }
});

// Register plugins
async function registerPlugins() {
  await server.register(import('@fastify/helmet'));
  await server.register(import('@fastify/cors'), {
    origin: process.env.NODE_ENV === 'production' ? false : true
  });

  await server.register(import('@fastify/swagger'), {
    openapi: {
      info: {
        title: 'Construction ERP API',
        description: 'API for Construction Management ERP System',
        version: '0.1.0'
      }
    }
  });

  await server.register(import('@fastify/swagger-ui'), {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'full',
      deepLinking: false
    }
  });
}

// Health check route
server.get('/health', () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// API v1 routes
void server.register(function(fastify) {
  fastify.get('/projects', () => {
    return { projects: [] };
  });
}, { prefix: '/api/v1' });

async function start() {
  try {
    await registerPlugins();

    const port = Number(process.env.PORT) || 3001;
    const host = process.env.HOST ?? '0.0.0.0';

    await server.listen({ port, host });
    server.log.info(`Server listening on http://${host}:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  void (async () => {
    server.log.info('Received SIGINT, shutting down gracefully');
    await server.close();
    process.exit(0);
  })();
});

process.on('SIGTERM', () => {
  void (async () => {
    server.log.info('Received SIGTERM, shutting down gracefully');
    await server.close();
    process.exit(0);
  })();
});

void start();