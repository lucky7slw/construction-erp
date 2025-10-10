import fastify, { FastifyInstance } from 'fastify';
import { AIService } from '../services/ai/ai.service';
import { aiRoutes } from '../routes/ai.routes';

export interface TestAppOptions {
  aiService?: AIService;
}

export function build(options: TestAppOptions = {}): FastifyInstance {
  const app = fastify({
    logger: false, // Disable logging in tests
  });

  // Mock authentication middleware for tests
  app.addHook('preHandler', async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (request.url.includes('/ai/') && request.url !== '/api/v1/ai/health') {
      // Require auth for protected AI routes
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }
      // Mock user for testing
      (request as any).user = {
        id: 'test-user-123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      };
    }
  });

  // Register AI routes if AI service is provided
  if (options.aiService) {
    app.register(aiRoutes, {
      prefix: '/api/v1/ai',
      aiService: options.aiService,
    });
  }

  return app;
}