import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '../generated/prisma';
import { GoogleIntegrationService } from '../services/integrations/google.service';
import { QuickBooksIntegrationService } from '../services/integrations/quickbooks.service';

interface IntegrationsOptions {
  prisma: PrismaClient;
}

export default async function integrationsRoutes(fastify: FastifyInstance, options: IntegrationsOptions) {
  const { prisma } = options;
  const googleService = new GoogleIntegrationService(prisma);
  const quickbooksService = new QuickBooksIntegrationService(prisma);

  // Admin: Get all integrations
  fastify.get('/all', async (request, reply) => {
    const integrations = await prisma.integration.findMany({
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return reply.send(integrations);
  });

  // Get user integrations
  fastify.get('/me', async (request, reply) => {
    const userId = (request as any).user?.userId;
    
    const integrations = await prisma.integration.findMany({
      where: { userId },
      select: {
        id: true,
        provider: true,
        isActive: true,
        createdAt: true,
      },
    });

    return reply.send(integrations);
  });

  // Google OAuth
  fastify.get('/google/auth', async (request, reply) => {
    const userId = (request as any).user?.userId;
    const authUrl = googleService.getAuthUrl(userId);
    return reply.send({ authUrl });
  });

  // QuickBooks OAuth
  fastify.get('/quickbooks/auth', async (request, reply) => {
    const userId = (request as any).user?.userId;
    const authUrl = quickbooksService.getAuthUrl(userId);
    return reply.send({ authUrl });
  });

  // Google Actions
  fastify.post('/google/calendar/event', async (request, reply) => {
    const userId = (request as any).user?.userId;
    const event = await googleService.createCalendarEvent(userId, request.body as any);
    return reply.send(event);
  });

  fastify.post('/google/drive/upload', async (request, reply) => {
    const userId = (request as any).user?.userId;
    const data = await request.file();
    if (!data) return reply.code(400).send({ error: 'No file' });

    const buffer = await data.toBuffer();
    const file = await googleService.uploadToDrive(userId, {
      name: data.filename,
      mimeType: data.mimetype,
      data: buffer,
    });

    return reply.send(file);
  });

  fastify.post('/google/gmail/send', async (request, reply) => {
    const userId = (request as any).user?.userId;
    const result = await googleService.sendEmail(userId, request.body as any);
    return reply.send(result);
  });

  // QuickBooks Actions
  fastify.post('/quickbooks/customers', async (request, reply) => {
    const userId = (request as any).user?.userId;
    const customer = await quickbooksService.createCustomer(userId, request.body as any);
    return reply.send(customer);
  });

  fastify.post('/quickbooks/invoices', async (request, reply) => {
    const userId = (request as any).user?.userId;
    const invoice = await quickbooksService.createInvoice(userId, request.body as any);
    return reply.send(invoice);
  });

  fastify.post('/quickbooks/expenses', async (request, reply) => {
    const userId = (request as any).user?.userId;
    const expense = await quickbooksService.createExpense(userId, request.body as any);
    return reply.send(expense);
  });

  // Sync expenses to QuickBooks
  fastify.post('/quickbooks/sync-expenses', async (request, reply) => {
    const userId = (request as any).user?.userId;
    const companyId = (request as any).user?.companyId;
    const result = await quickbooksService.syncExpenses(userId, companyId);
    return reply.send(result);
  });

  // Disconnect integration
  fastify.delete('/:provider', async (request, reply) => {
    const userId = (request as any).user?.userId;
    const { provider } = request.params as { provider: string };

    await prisma.integration.update({
      where: {
        userId_provider: {
          userId,
          provider: provider.toUpperCase() as any,
        },
      },
      data: { isActive: false },
    });

    return reply.send({ success: true });
  });
}
