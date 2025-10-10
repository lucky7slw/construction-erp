type SelectionsRoutesOptions = { prisma: PrismaClient; };
import { FastifyPluginAsync } from 'fastify';
import { PrismaClient } from '../generated/prisma';
import { SelectionsService } from '../services/selections/selections.service';

export const selectionsRoutes: FastifyPluginAsync<SelectionsRoutesOptions> = async (fastify, options) => {
  const { prisma } = options;
  const selectionsService = new SelectionsService(prisma);

  // List selections
  fastify.get('/', async (request, reply) => {
    const { projectId, status, category, customerId } = request.query as any;

    if (!projectId) {
      return reply.code(400).send({ error: 'projectId is required' });
    }

    const selections = await selectionsService.listSelections(projectId, {
      status, category, customerId
    });

    return reply.send({ selections });
  });

  // Get selection
  fastify.get('/selections/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const selection = await selectionsService.getSelection(id);
    return reply.send({ selection });
  });

  // Create selection
  fastify.post('/', async (request, reply) => {
    const data = request.body as any;
    const selection = await selectionsService.createSelection(
      { ...data, dueDate: data.dueDate ? new Date(data.dueDate) : undefined },
      (request as any).user.userId
    );
    return reply.code(201).send({ selection });
  });

  // Update selection
  fastify.put('/selections/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { userId, reason, ...updates } = request.body as any;
    const selection = await selectionsService.updateSelection(
      id,
      updates,
      userId || (request as any).user.userId,
      reason
    );
    return reply.send({ selection });
  });

  // Delete selection
  fastify.delete('/selections/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    await selectionsService.deleteSelection(id);
    return reply.code(204).send();
  });

  // Add option
  fastify.post('/selections/:id/options', async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = request.body as any;
    const option = await selectionsService.addOption(id, data);
    return reply.code(201).send({ option });
  });

  // Update option
  fastify.put('/selections/options/:optionId', async (request, reply) => {
    const { optionId } = request.params as { optionId: string };
    const updates = request.body as any;
    const option = await selectionsService.updateOption(optionId, updates);
    return reply.send({ option });
  });

  // Delete option
  fastify.delete('/selections/options/:optionId', async (request, reply) => {
    const { optionId } = request.params as { optionId: string };
    await selectionsService.deleteOption(optionId);
    return reply.code(204).send();
  });

  // Select option
  fastify.post('/selections/:id/select-option', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { optionId } = request.body as { optionId: string };
    const selection = await selectionsService.selectOption(
      id,
      optionId,
      (request as any).user.userId
    );
    return reply.send({ selection });
  });

  // Approve selection
  fastify.post('/selections/:id/approve', async (request, reply) => {
    const { id } = request.params as { id: string };
    const selection = await selectionsService.approveSelection(
      id,
      (request as any).user.userId
    );
    return reply.send({ selection });
  });

  // Mark as ordered
  fastify.post('/selections/:id/order', async (request, reply) => {
    const { id } = request.params as { id: string };
    const selection = await selectionsService.markAsOrdered(
      id,
      (request as any).user.userId
    );
    return reply.send({ selection });
  });

  // Mark as installed
  fastify.post('/selections/:id/install', async (request, reply) => {
    const { id } = request.params as { id: string };
    const selection = await selectionsService.markAsInstalled(
      id,
      (request as any).user.userId
    );
    return reply.send({ selection });
  });

  // Reject selection
  fastify.post('/selections/:id/reject', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { reason } = request.body as { reason: string };
    const selection = await selectionsService.rejectSelection(
      id,
      (request as any).user.userId,
      reason
    );
    return reply.send({ selection });
  });

  // Get summary
  fastify.get('/selections-summary', async (request, reply) => {
    const { projectId } = request.query as { projectId: string };
    if (!projectId) {
      return reply.code(400).send({ error: 'projectId is required' });
    }
    const summary = await selectionsService.getSelectionsSummary(projectId);
    return reply.send(summary);
  });

  // Get overdue
  fastify.get('/selections-overdue', async (request, reply) => {
    const { projectId } = request.query as { projectId: string };
    if (!projectId) {
      return reply.code(400).send({ error: 'projectId is required' });
    }
    const overdue = await selectionsService.getOverdueSelections(projectId);
    return reply.send({ overdue });
  });

  // Export CSV
  fastify.get('/selections-export', async (request, reply) => {
    const { projectId } = request.query as { projectId: string };
    if (!projectId) {
      return reply.code(400).send({ error: 'projectId is required' });
    }
    const csv = await selectionsService.exportSelectionsToCSV(projectId);
    reply.header('Content-Type', 'text/csv');
    reply.header('Content-Disposition', `attachment; filename=selections-${projectId}.csv`);
    return reply.send(csv);
  });
};

