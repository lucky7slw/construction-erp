import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '../generated/prisma';
import { AuditLogService } from '../services/audit-log.service';

interface AuditLogsOptions {
  prisma: PrismaClient;
}

export default async function auditLogsRoutes(fastify: FastifyInstance, options: AuditLogsOptions) {
  const { prisma } = options;
  const service = new AuditLogService(prisma);

  // Get all audit logs (super admin only)
  fastify.get('/', async (request, reply) => {
    const user = (request as any).user;
    const isSuperAdmin = user?.roles?.some((r: any) => r.name === 'super_admin');
    
    if (!isSuperAdmin) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    const { userId, action, resource, startDate, endDate, limit, offset } = request.query as any;

    const result = await service.getLogs({
      userId,
      companyId: user.companyId,
      action,
      resource,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
    });

    return reply.send(result);
  });

  // Get user activity
  fastify.get('/user/:userId', async (request, reply) => {
    const user = (request as any).user;
    const { userId } = request.params as any;
    const { days } = request.query as any;

    const isSuperAdmin = user?.roles?.some((r: any) => r.name === 'super_admin');
    if (!isSuperAdmin && user.userId !== userId) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    const activity = await service.getUserActivity(userId, days ? parseInt(days) : 30);
    return reply.send(activity);
  });

  // Get login history
  fastify.get('/logins', async (request, reply) => {
    const user = (request as any).user;
    const isSuperAdmin = user?.roles?.some((r: any) => r.name === 'super_admin');
    
    if (!isSuperAdmin) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    const { limit } = request.query as any;
    const history = await service.getLoginHistory(user.companyId, limit ? parseInt(limit) : 50);
    return reply.send(history);
  });

  // Get company activity
  fastify.get('/company', async (request, reply) => {
    const user = (request as any).user;
    const isSuperAdmin = user?.roles?.some((r: any) => r.name === 'super_admin');
    
    if (!isSuperAdmin) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    const { startDate, endDate, limit } = request.query as any;

    const activity = await service.getCompanyActivity(user.companyId, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit) : 100,
    });

    return reply.send(activity);
  });
}
