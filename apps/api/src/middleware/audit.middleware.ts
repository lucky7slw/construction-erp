import type { FastifyRequest, FastifyReply } from 'fastify';
import { AuditLogService } from '../services/audit-log.service';
import { prisma } from '../lib/database';

const auditService = new AuditLogService(prisma);

const actionMap: Record<string, 'CREATE' | 'READ' | 'UPDATE' | 'DELETE'> = {
  POST: 'CREATE',
  GET: 'READ',
  PUT: 'UPDATE',
  PATCH: 'UPDATE',
  DELETE: 'DELETE',
};

export async function auditMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const user = (request as any).user;
  
  if (!user) return;

  const action = actionMap[request.method] || 'READ';
  const resource = request.url.split('/')[3] || 'unknown'; // Extract resource from URL
  const resourceId = request.params && (request.params as any).id;

  try {
    await auditService.log({
      userId: user.userId,
      action,
      resource,
      resourceId,
      newValues: request.method !== 'GET' ? request.body : undefined,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });
  } catch (error) {
    // Don't fail the request if audit logging fails
    request.log.error({ error }, 'Failed to log audit entry');
  }
}
