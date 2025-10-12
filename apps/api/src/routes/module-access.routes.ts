import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '../generated/prisma';
import { ModuleAccessService } from '../services/module-access.service';

interface ModuleAccessOptions {
  prisma: PrismaClient;
}

export default async function moduleAccessRoutes(fastify: FastifyInstance, options: ModuleAccessOptions) {
  const { prisma } = options;
  const service = new ModuleAccessService(prisma);

  fastify.get('/roles', async (request, reply) => {
    const roles = await prisma.role.findMany({
      select: { id: true, name: true, description: true },
    });
    return reply.send(roles);
  });

  fastify.get('/me', async (request, reply) => {
    const userId = (request as any).user?.userId;
    const modules = await service.getUserVisibleModules(userId);
    return reply.send({ modules });
  });

  fastify.post('/role/:roleId', async (request, reply) => {
    const { roleId } = request.params as { roleId: string };
    const { module, isVisible } = request.body as { module: string; isVisible: boolean };
    const result = await service.setRoleModuleAccess(roleId, module, isVisible);
    return reply.send(result);
  });

  fastify.post('/user/:userId', async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const { module, isVisible } = request.body as { module: string; isVisible: boolean };
    const result = await service.setUserModuleAccess(userId, module, isVisible);
    return reply.send(result);
  });

  fastify.get('/role/:roleId', async (request, reply) => {
    const { roleId } = request.params as { roleId: string };
    const access = await service.getRoleModuleAccess(roleId);
    return reply.send(access);
  });

  fastify.get('/user/:userId', async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const access = await service.getUserModuleAccess(userId);
    return reply.send(access);
  });
}
