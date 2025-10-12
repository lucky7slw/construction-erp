import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '../generated/prisma';
import { BackupSyncService } from '../services/automation/backup-sync.service';

interface AutomationOptions {
  prisma: PrismaClient;
}

export default async function automationRoutes(fastify: FastifyInstance, options: AutomationOptions) {
  const { prisma } = options;
  const backupSync = new BackupSyncService(prisma);

  fastify.post('/backup', async (request, reply) => {
    const userId = (request as any).user?.userId;
    const result = await backupSync.runAutomatedBackup(userId);
    return reply.send(result);
  });

  fastify.post('/sync-calendar', async (request, reply) => {
    const userId = (request as any).user?.userId;
    const result = await backupSync.syncCalendarEvents(userId);
    return reply.send(result);
  });
}
